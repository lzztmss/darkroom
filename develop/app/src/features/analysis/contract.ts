import { z } from 'zod';

const Unit = z.number().min(0).max(1);
const Box = z.object({
  x: Unit,
  y: Unit,
  width: Unit,
  height: Unit,
}).refine((box) => box.width > 0 && box.height > 0 && box.x + box.width <= 1 && box.y + box.height <= 1);

const DecisionBase = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  decision: z.enum(['draw', 'omit']),
  rationale: z.string().min(1),
  confidence: Unit,
  omit_reason: z.string().nullable(),
});

export const DimensionSchema = z.object({
  dimension: z.enum(['composition', 'light', 'color_tone', 'narrative', 'technical']),
  score: z.number().int().min(0).max(100),
  evidence: z.string().min(1),
  suggestion: z.string().min(1),
  confidence: Unit,
});

export const AnalysisResultSchema = z.object({
  schema_version: z.literal('1.0.0').default('1.0.0'),
  evaluation_id: z.string().min(1),
  photo_id: z.string().min(1),
  model: z.object({
    provider: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    prompt_version: z.string().min(1),
  }),
  overall_score: z.number().int().min(0).max(100),
  overall_score_method: z.literal('mean_of_dimensions_v1').default('mean_of_dimensions_v1'),
  score_summary: z.string().min(1),
  dimension_scores: z.array(DimensionSchema).length(5),
  subject_boxes: z.array(DecisionBase.extend({ box: Box.nullable() })).min(1),
  leading_lines: z.array(DecisionBase.extend({
    points: z.array(z.tuple([Unit, Unit])).min(2).max(8).nullable(),
  })).min(1),
  crop_boxes: z.array(DecisionBase.extend({
    box: Box.nullable(),
    loss_ratio: z.number().min(0).max(0.25),
    preserves_intent: z.string().min(1),
  })).min(1).max(2),
  observations: z.array(z.string().min(1)).min(1),
  interpretations: z.array(z.string().min(1)).min(1),
  subjective_judgments: z.array(z.object({
    judgment: z.string().min(1),
    alternative_reading: z.string().min(1),
  })).min(1),
  suggestions: z.array(z.object({
    type: z.enum(['next_shoot', 'postprocess', 'crop_review']),
    action: z.string().min(1),
    why: z.string().min(1),
    verification: z.string().min(1),
    confidence: Unit,
  })).min(1),
  confidence: z.object({
    overall: Unit,
    subject_boxes: Unit,
    leading_lines: Unit,
    crop_boxes: Unit,
  }),
  safety_flags: z.array(z.string()),
});

export const AnalysisRequestSchema = z.object({
  image: z.object({
    dataUrl: z.string().startsWith('data:image/jpeg;base64,'),
    width: z.number().int().positive().max(2048),
    height: z.number().int().positive().max(2048),
    name: z.string().min(1).max(255),
  }),
  context: z.object({
    genre: z.string().max(40).nullable(),
    intent: z.string().trim().max(200),
    focus: z.array(z.string().max(30)).max(5),
  }),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export function calculateOverallScore(dimensions: Array<{ score: number }>): number {
  if (dimensions.length !== 5) throw new Error('必须包含五个分项评分');
  return Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
}

export function cleanScoreSummary(value: string): string {
  return value
    .replace(/总分(?:由五个分项算术平均计算|仅供比较|仅作快速索引)[^。]*。?/gu, '')
    .replace(/总分仅作快速索引，?不能单独定义照片好坏。?/gu, '')
    .trim();
}

export function normalizeBox(value: unknown) {
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const direct = {
      x: Number(source.x),
      y: Number(source.y),
      width: Number(source.width),
      height: Number(source.height),
    };
    if (Box.safeParse(direct).success) return direct;
  }
  return null;
}

export function normalizePreservesIntent(value: unknown): string {
  if (value === true) return '保留创作意图';
  if (value === false) return '可能改变创作意图';
  if (typeof value === 'string' && value.trim()) return value;
  return '未提供足够说明';
}

export function normalizeScoreScale(scores: number[]): number[] {
  const usesTenPointScale = scores.length === 5
    && scores.every((score) => Number.isFinite(score) && score >= 0 && score <= 10);
  return scores.map((score) => Math.round(score * (usesTenPointScale ? 10 : 1)));
}

function normalizeOmitReason(source: Record<string, unknown>, fallback: string): string | null {
  if (source.decision === 'draw') return null;
  if (typeof source.omit_reason === 'string' && source.omit_reason.trim()) return source.omit_reason;
  if (typeof source.rationale === 'string' && source.rationale.trim()) return source.rationale;
  return fallback;
}

function normalizeModelShape(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const value = input as Record<string, unknown>;
  const subjectBoxes = Array.isArray(value.subject_boxes)
    ? value.subject_boxes.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const source = item as Record<string, unknown>;
        const box = source.decision === 'omit' ? null : normalizeBox(source.box);
        if (source.decision === 'draw' && !box) {
          return {
            ...source,
            decision: 'omit',
            box: null,
            omit_reason: '模型返回的主体坐标不可靠，已隐藏框线',
          };
        }
        return {
          ...source,
          box,
          omit_reason: normalizeOmitReason(source, '模型未提供可靠主体，已隐藏框线'),
        };
      })
    : value.subject_boxes;
  const leadingLines = Array.isArray(value.leading_lines)
    ? value.leading_lines.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const source = item as Record<string, unknown>;
        return {
          ...source,
          points: source.decision === 'omit' ? null : source.points,
          omit_reason: normalizeOmitReason(source, '模型未提供可靠引导线，已隐藏线条'),
        };
      })
    : value.leading_lines;
  const cropBoxes = Array.isArray(value.crop_boxes)
    ? value.crop_boxes.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const source = item as Record<string, unknown>;
        const box = source.decision === 'omit' ? null : normalizeBox(source.box);
        const normalized = {
          ...source,
          box,
          loss_ratio: source.decision === 'omit' ? 0 : Number(source.loss_ratio),
          preserves_intent: normalizePreservesIntent(source.preserves_intent),
          omit_reason: normalizeOmitReason(source, '模型未提供可靠裁切方案，已保留原构图'),
        };
        if (source.decision === 'draw' && !box) {
          return {
            ...normalized,
            decision: 'omit',
            box: null,
            loss_ratio: 0,
            omit_reason: '模型返回的裁切坐标不可靠，已保留原构图',
          };
        }
        return normalized;
      })
    : value.crop_boxes;
  const rawScores = Array.isArray(value.dimension_scores)
    ? value.dimension_scores.map((item) => Number((item as Record<string, unknown>)?.score))
    : [];
  const normalizedScores = normalizeScoreScale(rawScores);
  const dimensions = Array.isArray(value.dimension_scores)
    ? value.dimension_scores.map((item, index) => item && typeof item === 'object'
      ? {
          ...item,
          score: normalizedScores[index],
        }
      : item)
    : value.dimension_scores;

  return {
    ...value,
    schema_version: '1.0.0',
    overall_score: normalizedScores.length === 5
      ? Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / 5)
      : Math.round(Number(value.overall_score)),
    overall_score_method: 'mean_of_dimensions_v1',
    dimension_scores: dimensions,
    subject_boxes: subjectBoxes,
    leading_lines: leadingLines,
    crop_boxes: cropBoxes,
  };
}

export function normalizeAnalysisResult(input: unknown): AnalysisResult {
  const result = AnalysisResultSchema.parse(normalizeModelShape(input));
  return {
    ...result,
    overall_score: calculateOverallScore(result.dimension_scores),
    score_summary: cleanScoreSummary(result.score_summary),
  };
}

export type StoredAnalysis = {
  result: AnalysisResult;
  imageDataUrl: string;
  displayImageUrl?: string;
  imageName: string;
  sourceImageName?: string;
  intent: string;
  genre?: string | null;
  focus?: string[];
};

export const ANALYSIS_STORAGE_KEY = 'darkroom:last-analysis';
