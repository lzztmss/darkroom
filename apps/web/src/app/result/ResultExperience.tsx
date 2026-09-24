'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ANALYSIS_STORAGE_KEY, normalizeAnalysisResult, StoredAnalysis } from '../../features/analysis/contract';
import { scoreTone } from '../../features/analysis/presentation';
import { FeedbackForm } from '../../features/feedback/FeedbackForm';

const dimensionLabels = {
  composition: '构图', light: '光线', color_tone: '色彩与影调', narrative: '叙事', technical: '技术质量',
} as const;

const professionalDimensionLabels = {
  intent_fit: '意图与语境完成度',
  visual_structure: '视觉结构与观看路径',
  content_narrative: '内容、关系与叙事',
  light_color: '光线、色彩与影调',
  timing_relationship: '时机、动作与决定性瞬间',
  craft: '技术与制作选择',
  voice_originality: '独特性与作者声音',
} as const;

const strategyLabels: Record<string, string> = {
  single_subject: '单主体',
  layered_ambiguous: '复合关系与开放歧义',
  minimal_space: '极简留白',
  geometric: '几何形式',
  environmental_portrait: '环境肖像',
  decisive_moment: '决定性瞬间',
  color_light: '色彩关系与光线',
  conceptual: '概念或过程实验',
  unclear: '暂不确定',
};

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
          setStored({
            ...parsed,
            result: normalizeAnalysisResult(parsed.result, {
              genre: parsed.genre,
              intentProvided: Boolean(parsed.intent?.trim()),
            }),
          });
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
  const scoreItems = result.professional_scores ?? result.dimension_scores;
  const evaluationContext = result.evaluation_context;
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
      : null),
    ...result.leading_lines.map((item) => item.decision === 'draw'
      ? `${item.label} · 置信度 ${Math.round(item.confidence * 100)}%：${item.rationale}`
      : null),
    ...result.crop_boxes.map((item) => {
      if (item.decision === 'omit') return null;
      if (!crops.some((crop) => crop.id === item.id)) return `裁切保护：不显示「${item.label}」，避免裁掉过多画面或损失细节。`;
      return `${item.label} · 置信度 ${Math.round(item.confidence * 100)}%：${item.rationale}`;
    }),
  ].filter((note): note is string => Boolean(note));

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
          <p className="workbench-status">结构化分析 · 工作台规则已通过校验。</p>

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
                <label><input checked={layers.has('subject')} disabled={subjects.length === 0} onChange={() => toggleLayer('subject')} type="checkbox" /> 主体框</label>
                <label><input checked={layers.has('line')} disabled={lines.length === 0} onChange={() => toggleLayer('line')} type="checkbox" /> 引导线</label>
                <label><input checked={layers.has('crop')} disabled={crops.length === 0} onChange={() => toggleLayer('crop')} type="checkbox" /> 裁切框</label>
              </div>
              {annotationNotes.length > 0
                ? <ul className="workbench-annotation-notes">{annotationNotes.map((note) => <li key={note}>{note}</li>)}</ul>
                : <p className="workbench-annotation-empty">当前没有足够可靠的图上标注，评分仍基于完整画面关系。</p>}
            </div>

            <aside className="workbench-score-panel" aria-label="照片分析结果">
              <div className="workbench-overall"><span>快速索引</span><strong>{result.overall_score}</strong></div>
              <p>{result.score_summary}</p>
              {evaluationContext && <p className="workbench-evaluation-context">评价语境：{evaluationContext.profile_label} · 画面策略：{strategyLabels[evaluationContext.strategy] ?? '暂不确定'}（置信度 {Math.round(evaluationContext.strategy_confidence * 100)}%）</p>}
              {evaluationContext?.floor_applied && <p className="workbench-score-calibration">综合指数已按明确画面策略和有效证据校准，风格差异不会被当作失败。</p>}
              <div className="workbench-dimensions">
                {scoreItems.map((dimension) => {
                  const isProfessional = 'professional_scores' in result && result.professional_scores?.some((item) => item.dimension === dimension.dimension);
                  const label = isProfessional
                    ? professionalDimensionLabels[dimension.dimension as keyof typeof professionalDimensionLabels]
                    : dimensionLabels[dimension.dimension as keyof typeof dimensionLabels];
                  const isUnrated = dimension.confidence <= 0;
                  const tone = isUnrated ? 'unrated' : scoreTone(dimension.score);
                  return (
                    <article className={`workbench-dimension workbench-dimension--${tone}`} key={dimension.dimension}>
                      <header><strong>{label}</strong><span>{isUnrated ? '未评估' : `评分 ${dimension.score} · 置信度 ${Math.round(dimension.confidence * 100)}%`}</span></header>
                      {isUnrated
                        ? <div aria-label={`${label} 未评估`} className="workbench-score-meter workbench-score-meter--unrated"><i /></div>
                        : <div aria-label={`${label} ${dimension.score} 分`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={dimension.score} className="workbench-score-meter" role="progressbar"><i style={{ width: `${dimension.score}%` }} /></div>}
                      <p>{dimension.evidence}</p>
                      {!isUnrated && <p className="workbench-dimension-suggestion">建议：{dimension.suggestion}</p>}
                    </article>
                  );
                })}
              </div>
              <details><summary>校验信息</summary><p>结构、分数和坐标已通过工作台规则校验。</p></details>
            </aside>

            <div className="workbench-critique-grid">
              <article><h3>可直接观察的事实</h3><ul>{result.observations.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>基于摄影知识的解释</h3><ul>{result.interpretations.map((item) => <li key={item}>{item}</li>)}</ul></article>
              {(stored.intent ?? '').trim() && <article className="workbench-intent"><h3>本次创作意图</h3><p>{stored.intent}</p><small>意图只用于意图与语境完成度的阅读，不改写可观察事实。</small></article>}
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
