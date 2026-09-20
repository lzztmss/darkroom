'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ANALYSIS_STORAGE_KEY, normalizeAnalysisResult, StoredAnalysis } from '../../features/analysis/contract';
import { FeedbackForm } from '../../features/feedback/FeedbackForm';

const dimensionLabels = {
  composition: '构图', light: '光线', color_tone: '色彩与影调', narrative: '叙事', technical: '技术质量',
} as const;

type Layer = 'subject' | 'line' | 'crop';

export function ResultExperience() {
  const [stored, setStored] = useState<StoredAnalysis | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [layers, setLayers] = useState<Set<Layer>>(new Set(['subject', 'line', 'crop']));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredAnalysis;
          setStored({ ...parsed, result: normalizeAnalysisResult(parsed.result) });
        }
      } catch {
        sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
      } finally {
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleLayer(layer: Layer) {
    setLayers((current) => {
      const next = new Set(current);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  if (!loaded) return <main className="result-page result-empty"><p>正在打开点评…</p></main>;
  if (!stored) {
    return (
      <main className="result-page result-empty">
        <p>还没有可以显示的点评。</p>
        <Link className="result-new" href="/analyze">选择一张照片</Link>
      </main>
    );
  }

  const { result } = stored;
  const subjects = result.subject_boxes.filter((item) => item.decision === 'draw' && item.confidence >= 0.55 && item.box);
  const lines = result.leading_lines.filter((item) => item.decision === 'draw' && item.confidence >= 0.55 && item.points);
  const crops = result.crop_boxes.filter((item) => {
    if (item.decision !== 'draw' || item.confidence < 0.75 || !item.box) return false;
    const geometricLoss = 1 - item.box.width * item.box.height;
    return geometricLoss <= 0.25
      && item.loss_ratio <= 0.25
      && Math.abs(geometricLoss - item.loss_ratio) <= 0.08;
  });

  const annotationNotes = [
    ...result.subject_boxes.map((item) => item.decision === 'draw'
      ? `${item.label} · 置信度 ${Math.round(item.confidence * 100)}%：${item.rationale}`
      : `不画「${item.label}」：${item.omit_reason}`),
    ...result.leading_lines.map((item) => item.decision === 'draw'
      ? `${item.label} · 置信度 ${Math.round(item.confidence * 100)}%：${item.rationale}`
      : `不画「${item.label}」：${item.omit_reason}`),
    ...result.crop_boxes.map((item) => {
      if (item.decision === 'omit') return `不画「${item.label}」：${item.omit_reason}`;
      if (!crops.some((crop) => crop.id === item.id)) return `裁切保护：不显示「${item.label}」，避免裁掉过多画面或损失细节。`;
      return `${item.label} · 置信度 ${Math.round(item.confidence * 100)}%：${item.rationale}`;
    }),
  ];

  return (
    <main className="analysis-workbench">
      <header className="workbench-topbar">
        <div>
          <p className="workbench-eyebrow">本地照片 · 私密分析</p>
          <h1>暗房摄影分析工作台</h1>
        </div>
        <div className="workbench-actions">
          <Link className="workbench-fill-action" href="/"><span>首页</span></Link>
          <Link className="workbench-fill-action" href="/history"><span>历史记录</span></Link>
          <Link className="workbench-fill-action" href="/analyze"><span>再看一张照片</span></Link>
        </div>
      </header>

      <div className="workbench-layout">
        <section className="workbench-workspace">
          <p className="workbench-status">Qwen API JSON · 工作台 schema {result.schema_version} 已通过校验。</p>

          <div className="workbench-photo-heading">
            <div>
              <p className="workbench-eyebrow">{stored.genre || '摄影分析'} · {result.photo_id}</p>
              <h2>{stored.imageName}</h2>
              <p className="workbench-muted">AI 读取压缩分析副本；本次点评优先显示本地原图，原图不修改。</p>
            </div>
            <p className="workbench-rights">模型：{result.model.name} · Prompt {result.model.prompt_version}</p>
          </div>

          <div className="workbench-review-layout">
            <div className="workbench-photo-block">
              <div className="workbench-photo-stage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${stored.imageName} 的完整分析图`}
                  onError={(event) => {
                    if (event.currentTarget.src !== stored.imageDataUrl) event.currentTarget.src = stored.imageDataUrl;
                  }}
                  src={stored.displayImageUrl || stored.imageDataUrl}
                />
                <svg aria-label="AI 坐标标注层" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1 1">
                  {layers.has('subject') && subjects.map((item) => item.box && <rect className="workbench-subject-shape" height={item.box.height} key={item.id} width={item.box.width} x={item.box.x} y={item.box.y} />)}
                  {layers.has('line') && lines.map((item) => item.points && <polyline className="workbench-line-shape" key={item.id} points={item.points.map(([x, y]) => `${x},${y}`).join(' ')} />)}
                  {layers.has('crop') && crops.map((item) => item.box && <rect className="workbench-crop-shape" height={item.box.height} key={item.id} width={item.box.width} x={item.box.x} y={item.box.y} />)}
                </svg>
              </div>

              <div className="workbench-layer-controls" aria-label="标注图层">
                <label><input checked={layers.has('subject')} onChange={() => toggleLayer('subject')} type="checkbox" /> 主体框</label>
                <label><input checked={layers.has('line')} onChange={() => toggleLayer('line')} type="checkbox" /> 引导线</label>
                <label><input checked={layers.has('crop')} onChange={() => toggleLayer('crop')} type="checkbox" /> 裁切框</label>
              </div>
              <ul className="workbench-annotation-notes">{annotationNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>

            <aside className="workbench-score-panel" aria-label="照片分析结果">
              <div className="workbench-overall"><span>快速索引</span><strong>{result.overall_score}</strong></div>
              <p>{result.score_summary}</p>
              <div className="workbench-dimensions">
                {result.dimension_scores.map((dimension) => (
                  <article className="workbench-dimension workbench-dimension--accent" key={dimension.dimension}>
                    <header><strong>{dimensionLabels[dimension.dimension]}</strong><span>评分 {dimension.score} · 置信度 {Math.round(dimension.confidence * 100)}%</span></header>
                    <div aria-label={`${dimensionLabels[dimension.dimension]} ${dimension.score} 分`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={dimension.score} className="workbench-score-meter" role="progressbar"><i style={{ width: `${dimension.score}%` }} /></div>
                    <p>{dimension.evidence}</p>
                    <p className="workbench-suggestion">{dimension.suggestion}</p>
                  </article>
                ))}
              </div>
              <details><summary>校验信息</summary><p>结构、分数和坐标已通过工作台规则校验。</p></details>
            </aside>

            <div className="workbench-critique-grid">
              <article><h3>可直接观察的事实</h3><ul>{result.observations.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>基于摄影知识的解释</h3><ul>{result.interpretations.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>主观判断与替代解读</h3>{result.subjective_judgments.map((item) => <div key={item.judgment}><p><strong>当前语境下更符合：</strong>{item.judgment}</p><p className="workbench-alternative"><strong>另一种合理理解：</strong>{item.alternative_reading}</p></div>)}</article>
              <article><h3>可执行建议</h3>{result.suggestions.map((item) => <div className="workbench-suggestion-card" key={`${item.type}-${item.action}`}><strong>{item.action}</strong><span>为什么：{item.why}</span><span>如何验证：{item.verification}</span></div>)}</article>
            </div>
          </div>

          <FeedbackForm evaluationId={result.evaluation_id} imageName={stored.imageName} modelName={result.model.name} photoId={result.photo_id} promptVersion={result.model.prompt_version} />
        </section>
      </div>
    </main>
  );
}
