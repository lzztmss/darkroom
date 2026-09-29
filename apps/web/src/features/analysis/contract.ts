import { z } from 'zod';
import {
  calculateProfessionalScore,
  getProfessionalProfile,
  normalizeEvaluationContext,
  PHOTO_STRATEGIES,
  PROFESSIONAL_DIMENSIONS,
  type ProfessionalDimension,
} from './professional-rubric';

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

const ProfessionalDimensionItemSchema = z.object({
  dimension: z.enum(PROFESSIONAL_DIMENSIONS),
  score: z.number().int().min(0).max(100),
  evidence: z.string().min(1),
  suggestion: z.string().min(1),
  confidence: Unit,
});

const ProfessionalScoresSchema = z.array(ProfessionalDimensionItemSchema).length(PROFESSIONAL_DIMENSIONS.length)
  .refine((items) => new Set(items.map((item) => item.dimension)).size === PROFESSIONAL_DIMENSIONS.length, {
    message: '专业维度必须各出现一次',
  });

export const ProfessionalDimensionSchema = ProfessionalDimensionItemSchema;

const AuthorCandidateSchema = z.object({
  name: z.string().min(1),
  work: z.string().nullable().default(null),
  confidence: Unit,
  evidence: z.string().min(1),
});

export const AuthorAttributionSchema = z.object({
  status: z.enum(['identified', 'possible', 'unknown']),
  primary_name: z.string().nullable(),
  candidates: z.array(AuthorCandidateSchema).max(3),
  confidence: Unit,
  evidence: z.string().min(1),
  source: z.enum(['visual_match', 'user_provided', 'authorized_catalog']),
});

export const EvaluationContextSchema = z.object({
  profile: z.string().min(1).default('general'),
  profile_label: z.string().min(1).default('通用摄影阅读'),
  strategy: z.enum(PHOTO_STRATEGIES).default('unclear'),
  strategy_confidence: Unit.default(0),
  intent_status: z.enum(['supported', 'partial', 'unclear', 'not_provided']).default('not_provided'),
  severe_issue: z.boolean().default(false),
  floor_applied: z.boolean().default(false),
  raw_score: z.number().int().min(0).max(100).default(0),
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
  overall_score_method: z.enum(['mean_of_dimensions_v1', 'weighted_context_v1']).default('mean_of_dimensions_v1'),
  score_summary: z.string().min(1),
  dimension_scores: z.array(DimensionSchema).length(5),
  professional_scores: ProfessionalScoresSchema.optional(),
  author_attribution: AuthorAttributionSchema.optional(),
  evaluation_context: EvaluationContextSchema.optional(),
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

const UNKNOWN_AUTHOR_ATTRIBUTION = {
  status: 'unknown' as const,
  primary_name: null,
  candidates: [],
  confidence: 0,
  evidence: '没有足够的视觉证据确认作者或具体作品。',
  source: 'visual_match' as const,
};

export function normalizeAuthorAttribution(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return UNKNOWN_AUTHOR_ATTRIBUTION;
  const source = value as Record<string, unknown>;
  const candidates = Array.isArray(source.candidates)
    ? source.candidates
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .slice(0, 3)
      .map((item) => ({
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '未命名作者',
        work: typeof item.work === 'string' && item.work.trim() ? item.work.trim() : null,
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
        evidence: typeof item.evidence === 'string' && item.evidence.trim() ? item.evidence : '未提供具体视觉依据',
      }))
    : [];
  const status = source.status === 'identified' || source.status === 'possible' ? source.status : 'unknown';
  const confidence = Math.max(0, Math.min(1, Number(source.confidence) || 0));
  const primaryName = typeof source.primary_name === 'string' && source.primary_name.trim()
    ? source.primary_name.trim()
    : candidates[0]?.name ?? null;
  const sourceName = source.source === 'user_provided' || source.source === 'authorized_catalog'
    ? source.source
    : 'visual_match';
  const trustedStatus = status === 'identified' && confidence < 0.82 ? 'possible' : status;
  return {
    status: trustedStatus,
    primary_name: trustedStatus === 'unknown' ? null : primaryName,
    candidates,
    confidence,
    evidence: typeof source.evidence === 'string' && source.evidence.trim() ? source.evidence : UNKNOWN_AUTHOR_ATTRIBUTION.evidence,
    source: sourceName,
  } as const;
}

export function normalizeScoreScale(scores: number[]): number[] {
  const usesTenPointScale = scores.length >= 5
    && scores.every((score) => Number.isFinite(score) && score >= 0 && score <= 10);
  return scores.map((score) => Math.round(score * (usesTenPointScale ? 10 : 1)));
}

function normalizeOmitReason(source: Record<string, unknown>, fallback: string): string | null {
  if (source.decision === 'draw') return null;
  if (typeof source.omit_reason === 'string' && source.omit_reason.trim()) return source.omit_reason;
  if (typeof source.rationale === 'string' && source.rationale.trim()) return source.rationale;
  return fallback;
}

const EMPTY_SUBJECT_BOX = {
  id: 'subject-none',
  label: '主体',
  decision: 'omit' as const,
  rationale: '模型未返回可靠主体',
  confidence: 0,
  omit_reason: '模型未返回可靠主体，已隐藏框线',
  box: null,
};

const EMPTY_LEADING_LINE = {
  id: 'leading-line-none',
  label: '引导线',
  decision: 'omit' as const,
  rationale: '模型未返回可靠引导线',
  confidence: 0,
  omit_reason: '模型未返回可靠引导线，已隐藏线条',
  points: null,
};

const EMPTY_CROP_BOX = {
  id: 'crop-none',
  label: '保留原构图',
  decision: 'omit' as const,
  rationale: '模型未返回可靠裁切方案',
  confidence: 0,
  omit_reason: '模型未返回可靠裁切方案，已保留原构图',
  box: null,
  loss_ratio: 0,
  preserves_intent: '保留原构图',
};

const LEGACY_TO_PROFESSIONAL: Record<string, ProfessionalDimension> = {
  composition: 'visual_structure',
  light: 'light_color',
  color_tone: 'light_color',
  narrative: 'content_narrative',
  technical: 'craft',
};

type ProfessionalScoreItem = z.infer<typeof ProfessionalDimensionItemSchema>;

function normalizeProfessionalScoreItems(value: unknown): ProfessionalScoreItem[] | null {
  if (!Array.isArray(value)) return null;
  const rawScores = value.map((item) => Number((item as Record<string, unknown>)?.score));
  const normalizedScores = normalizeScoreScale(rawScores);
  const normalized = value.map((item, index) => {
    if (!item || typeof item !== 'object') return item;
    return { ...(item as Record<string, unknown>), score: normalizedScores[index] };
  });
  const parsed = ProfessionalScoresSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

function deriveProfessionalScores(legacy: unknown): ProfessionalScoreItem[] | null {
  if (!Array.isArray(legacy)) return null;
  const items = legacy.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  const byDimension = new Map<string, Record<string, unknown>>(
    items.map((item) => [String(item.dimension), item]),
  );
  const lightItems = ['light', 'color_tone']
    .map((dimension) => byDimension.get(dimension))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  const lightScore = lightItems.length > 0
    ? Math.round(lightItems.reduce((sum, item) => sum + Number(item.score), 0) / lightItems.length)
    : 0;
  const lightEvidence = lightItems.map((item) => String(item.evidence)).join('；') || '旧版本未提供光线与色彩评分';
  const lightSuggestion = lightItems.map((item) => String(item.suggestion)).join('；') || '待专业评价体系重新分析';
  const result = PROFESSIONAL_DIMENSIONS.map((dimension) => {
    if (dimension === 'intent_fit' || dimension === 'timing_relationship' || dimension === 'voice_originality') {
      return {
        dimension,
        score: 0,
        evidence: '旧版本未评估该专业维度',
        suggestion: '待专业评价体系重新分析',
        confidence: 0,
      };
    }
    if (dimension === 'light_color') {
      return {
        dimension,
        score: lightScore,
        evidence: lightEvidence,
        suggestion: lightSuggestion,
        confidence: lightItems.length > 0
          ? Math.min(...lightItems.map((item) => Number(item.confidence)))
          : 0,
      };
    }
    const legacyDimension = Object.entries(LEGACY_TO_PROFESSIONAL)
      .find(([, mapped]) => mapped === dimension)?.[0];
    const source = legacyDimension ? byDimension.get(legacyDimension) : null;
    return {
      dimension,
      score: source ? Number(source.score) : 0,
      evidence: source ? String(source.evidence) : '旧版本未提供该专业维度',
      suggestion: source ? String(source.suggestion) : '待专业评价体系重新分析',
      confidence: source ? Number(source.confidence) : 0,
    };
  });
  const parsed = ProfessionalScoresSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

function deriveLegacyScores(professional: ProfessionalScoreItem[]): Array<z.infer<typeof DimensionSchema>> {
  const get = (dimension: ProfessionalDimension) => professional.find((item) => item.dimension === dimension);
  const visual = get('visual_structure');
  const light = get('light_color');
  const content = get('content_narrative');
  const craft = get('craft');
  return [
    { dimension: 'composition', score: visual?.score ?? 0, evidence: visual?.evidence ?? '未评估', suggestion: visual?.suggestion ?? '待补充', confidence: visual?.confidence ?? 0 },
    { dimension: 'light', score: light?.score ?? 0, evidence: light?.evidence ?? '未评估', suggestion: light?.suggestion ?? '待补充', confidence: light?.confidence ?? 0 },
    { dimension: 'color_tone', score: light?.score ?? 0, evidence: light?.evidence ?? '未评估', suggestion: light?.suggestion ?? '待补充', confidence: light?.confidence ?? 0 },
    { dimension: 'narrative', score: content?.score ?? 0, evidence: content?.evidence ?? '未评估', suggestion: content?.suggestion ?? '待补充', confidence: content?.confidence ?? 0 },
    { dimension: 'technical', score: craft?.score ?? 0, evidence: craft?.evidence ?? '未评估', suggestion: craft?.suggestion ?? '待补充', confidence: craft?.confidence ?? 0 },
  ];
}

function normalizeModelShape(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const value = input as Record<string, unknown>;
  const professionalScores = normalizeProfessionalScoreItems(value.professional_scores)
    ?? deriveProfessionalScores(value.dimension_scores);
  const legacyScores = Array.isArray(value.dimension_scores)
    ? value.dimension_scores
    : professionalScores
      ? deriveLegacyScores(professionalScores)
      : value.dimension_scores;
  const subjectBoxes = Array.isArray(value.subject_boxes)
    ? value.subject_boxes.length === 0
      ? [EMPTY_SUBJECT_BOX]
      : value.subject_boxes.map((item) => {
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
    ? value.leading_lines.length === 0
      ? [EMPTY_LEADING_LINE]
      : value.leading_lines.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const source = item as Record<string, unknown>;
        const lowConfidence = source.decision === 'draw' && Number(source.confidence) < 0.85;
        return {
          ...source,
          decision: lowConfidence ? 'omit' : source.decision,
          points: source.decision === 'omit' || lowConfidence ? null : source.points,
          omit_reason: lowConfidence
            ? '引导线置信度低于 85%，已隐藏线条'
            : normalizeOmitReason(source, '模型未提供可靠引导线，已隐藏线条'),
        };
      })
    : value.leading_lines;
  const cropBoxes = Array.isArray(value.crop_boxes)
    ? value.crop_boxes.length === 0
      ? [EMPTY_CROP_BOX]
      : value.crop_boxes.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const source = item as Record<string, unknown>;
        const box = source.decision === 'omit' ? null : normalizeBox(source.box);
        const lossRatio = source.decision === 'omit' ? 0 : Number(source.loss_ratio);
        const normalized = {
          ...source,
          box,
          loss_ratio: lossRatio,
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
        if (source.decision === 'draw' && (!Number.isFinite(lossRatio) || lossRatio < 0 || lossRatio > 0.25)) {
          return {
            ...normalized,
            decision: 'omit',
            box: null,
            loss_ratio: 0,
            omit_reason: '模型返回的裁切损失超过 25%，已保留原构图',
          };
        }
        return normalized;
      })
    : value.crop_boxes;
  const rawScores = Array.isArray(legacyScores)
    ? legacyScores.map((item) => Number((item as Record<string, unknown>)?.score))
    : [];
  const normalizedScores = normalizeScoreScale(rawScores);
  const dimensions = Array.isArray(legacyScores)
    ? legacyScores.map((item, index) => item && typeof item === 'object'
      ? {
          ...item,
          score: normalizedScores[index],
        }
      : item)
    : value.dimension_scores;

  return {
    ...value,
    schema_version: '1.0.0',
    professional_scores: professionalScores ?? value.professional_scores,
    author_attribution: normalizeAuthorAttribution(value.author_attribution),
    overall_score: normalizedScores.length === 5
      ? Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / 5)
      : Math.round(Number(value.overall_score)),
    dimension_scores: dimensions,
    subject_boxes: subjectBoxes,
    leading_lines: leadingLines,
    crop_boxes: cropBoxes,
  };
}

function suppressUnsafeCompositeSubjects(result: AnalysisResult): AnalysisResult {
  const context = normalizeEvaluationContext(result.evaluation_context);
  const drawnSubjects = result.subject_boxes.filter((item) => item.decision === 'draw');
  const compositeStrategy = context.strategy === 'layered_ambiguous'
    || context.strategy === 'decisive_moment';
  if (drawnSubjects.length === 0 || (!compositeStrategy && drawnSubjects.length <= 1)) return result;

  return {
    ...result,
    subject_boxes: result.subject_boxes.map((item) => item.decision === 'draw'
      ? {
          ...item,
          decision: 'omit' as const,
          box: null,
          omit_reason: '复合构图没有单一可靠主体框，已保留完整观看关系',
        }
      : item),
    confidence: {
      ...result.confidence,
      subject_boxes: 0,
    },
  };
}

function inferFallbackEvaluationContext(result: AnalysisResult, genre?: string | null) {
  const drawnSubjects = result.subject_boxes.filter((item) => item.decision === 'draw');
  const isStreetLike = typeof genre === 'string' && (genre.includes('街头') || genre.includes('纪实'));
  if (drawnSubjects.length > 1 || isStreetLike) {
    return { strategy: 'layered_ambiguous', strategy_confidence: 0.58, severe_issue: false } as const;
  }
  return undefined;
}

export function normalizeAnalysisResult(input: unknown, options: { genre?: string | null; intentProvided?: boolean } = {}): AnalysisResult {
  const result = AnalysisResultSchema.parse(normalizeModelShape(input));
  if (result.professional_scores?.length === PROFESSIONAL_DIMENSIONS.length) {
    const intentProvided = options.intentProvided
      ?? result.evaluation_context?.intent_status !== 'not_provided';
    const professionalScores = result.professional_scores.map((item) => {
      if (item.dimension !== 'intent_fit' || intentProvided) return item;
      return {
        ...item,
        score: 0,
        confidence: 0,
        evidence: '未提供创作意图，暂不评估',
      };
    });
    const rawContext = normalizeEvaluationContext(
      result.evaluation_context ?? inferFallbackEvaluationContext(result, options.genre),
    );
    const profile = getProfessionalProfile(options.genre ?? result.evaluation_context?.profile ?? null);
    const scoring = calculateProfessionalScore(professionalScores, profile, rawContext, result.author_attribution);
    const intentStatus = intentProvided
      ? result.evaluation_context?.intent_status ?? 'unclear'
      : 'not_provided';
    return suppressUnsafeCompositeSubjects({
      ...result,
      professional_scores: professionalScores,
      overall_score: scoring.adjusted,
      overall_score_method: 'weighted_context_v1',
      evaluation_context: {
        profile: profile.id,
        profile_label: profile.label,
        strategy: rawContext.strategy,
        strategy_confidence: rawContext.strategy_confidence,
        intent_status: intentStatus,
        severe_issue: rawContext.severe_issue,
        floor_applied: scoring.floorApplied,
        raw_score: scoring.raw,
      },
      confidence: {
        ...result.confidence,
        overall: scoring.confidence,
      },
      score_summary: cleanScoreSummary(result.score_summary),
    });
  }
  return suppressUnsafeCompositeSubjects({
    ...result,
    overall_score: calculateOverallScore(result.dimension_scores),
    score_summary: cleanScoreSummary(result.score_summary),
  });
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
