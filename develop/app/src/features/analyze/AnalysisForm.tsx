'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { ANALYSIS_STORAGE_KEY, StoredAnalysis } from '../analysis/contract';
import { saveAnalysisHistory } from '../history/history-store';
import { formatFileSize, PreparedImage, prepareImage } from '../upload/image-processing';

const categories = ['纪实', '街头', '人像', '风光', '城市空间', '实验 / 抽象', '不确定'];
const focusOptions = ['构图', '光线', '色彩', '叙事', '技术质量'];

export function AnalysisForm() {
  const router = useRouter();
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [intent, setIntent] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'analyzing' | 'validating'>('idle');
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const busy = phase !== 'idle';
  const waiting = phase === 'analyzing' || phase === 'validating';
  const buttonLabel = phase === 'preparing'
    ? '正在处理图片…'
    : phase === 'analyzing'
      ? '正在读取画面…'
      : phase === 'validating'
        ? '正在整理点评…'
      : '开始分析';

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [waiting]);

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhase('preparing');
    setError('');
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    try {
      const prepared = await prepareImage(file);
      setImage(prepared);
      setPhotoName(prepared.name.replace(/\.[^.]+$/u, ''));
    } catch (caught) {
      setImage(null);
      setError(caught instanceof Error ? caught.message : '无法处理这张图片');
    } finally {
      setPhase('idle');
    }
  }

  function toggleFocus(item: string) {
    setFocus((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item]);
  }

  async function startAnalysis() {
    if (!image || busy) return;
    const displayName = photoName.trim() || image.name.replace(/\.[^.]+$/u, '');
    setElapsedSeconds(0);
    setPhase('analyzing');
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: {
            dataUrl: image.dataUrl,
            width: image.width,
            height: image.height,
            name: image.name,
          },
          context: { genre: category, intent, focus },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '分析失败，请稍后重试');
      setPhase('validating');
      const storedAnalysis: StoredAnalysis = {
        result: payload.result,
        imageDataUrl: image.dataUrl,
        displayImageUrl: image.previewUrl,
        imageName: displayName,
        sourceImageName: image.name,
        intent,
        genre: category,
        focus,
      };
      sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(storedAnalysis));
      try {
        await saveAnalysisHistory({ ...storedAnalysis, displayImageUrl: undefined });
      } catch {
        // History is a local convenience. A storage quota or privacy setting must not hide a valid critique.
      }
      router.push('/result');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '分析失败，请稍后重试');
      setPhase('idle');
    }
  }

  return (
    <main className="analysis-page local-analysis-page">
      <header className="analysis-header">
        <Link className="analysis-brand" href="/"><span aria-hidden="true" /><strong>暗房</strong></Link>
        <div className="analysis-header-actions"><p>本地版 · 原图不修改</p><Link href="/">首页</Link><Link href="/history">历史记录</Link></div>
      </header>

      <div className="analysis-shell local-analysis-shell">
        <section className="analysis-photo-step" aria-labelledby="photo-step-title">
          <div className="analysis-step-label"><span>01</span><span>你的照片</span></div>
          <h1 id="photo-step-title">先放进一张照片。</h1>
          <p>照片会完整显示，不会自动裁边。</p>

          <label className="photo-picker fill-action" htmlFor="photo-file">
            <span>{image ? '换一张照片' : '选择照片'}</span>
            <small>JPEG · PNG · WebP，最大 25MB</small>
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="选择照片"
            disabled={busy}
            id="photo-file"
            onChange={selectPhoto}
            type="file"
          />

          {image && (
            <>
              <label className="photo-name-field" htmlFor="photo-name">
                <span>照片名称</span>
                <input aria-label="照片名称" disabled={busy} id="photo-name" maxLength={60} onChange={(event) => setPhotoName(event.target.value)} placeholder="给这次分析起个名字" value={photoName} />
                <small>{photoName.length} / 60 · 原文件 {image.name}</small>
              </label>
              <figure className="analysis-photo analysis-photo--local">
                {/* Local object URLs show the original file and should not pass through Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={`${image.name} 的完整预览`} src={image.previewUrl} />
                <figcaption>
                  <span>屏幕预览：本地原图</span>
                  <span>发送给 AI：{image.width} × {image.height} · {formatFileSize(image.analysisBytes)}</span>
                  <span>原文件 {formatFileSize(image.originalBytes)}</span>
                </figcaption>
              </figure>
            </>
          )}
        </section>

        <section className="analysis-intent-step" aria-labelledby="intent-step-title">
          <div className="analysis-step-heading">
            <div className="analysis-step-label"><span>02</span><span>你的想法</span></div>
            <p>全部选填</p>
          </div>
          <h2 id="intent-step-title">你最想让人看见什么？</h2>
          <p className="analysis-intro">它会帮助解释画面，但不会改变事实或替你加分。</p>

          <label className="analysis-field" htmlFor="shooting-intent">
            <span>创作意图</span><span>{intent.length} / 200</span>
          </label>
          <textarea
            aria-label="创作意图"
            disabled={busy}
            id="shooting-intent"
            maxLength={200}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="例如：我想留下雪地里人物与环境之间的距离感。"
            value={intent}
          />

          <div className="analysis-category-heading"><span>大致类型</span><span>单选</span></div>
          <div className="analysis-categories" aria-label="照片类型">
            {categories.map((item) => (
              <button aria-pressed={category === item} disabled={busy} key={item} onClick={() => setCategory(item)} type="button">{item}</button>
            ))}
          </div>

          <div className="analysis-category-heading"><span>重点关注</span><span>多选</span></div>
          <div className="analysis-categories" aria-label="重点关注">
            {focusOptions.map((item) => (
              <button aria-pressed={focus.includes(item)} disabled={busy} key={item} onClick={() => toggleFocus(item)} type="button">{item}</button>
            ))}
          </div>

          {error && <p className="analysis-error" role="alert">{error}</p>}
          <button aria-label={buttonLabel} className={`analysis-action${waiting ? ' is-analyzing' : ''}`} disabled={!image || busy} onClick={startAnalysis} type="button">
            <span>{buttonLabel}{waiting ? ` · ${elapsedSeconds} 秒` : ''}</span><i aria-hidden="true" />
          </button>
          {waiting && <p className="analysis-wait-note">已关闭模型深度思考并压缩输入；复杂画面仍可能需要几十秒，请不要重复提交。</p>}
          <p className="analysis-consent">只发送压缩分析副本。原图不修改；公开展示和模型改进默认关闭。</p>
        </section>
      </div>
    </main>
  );
}
