export const PROFESSIONAL_DIMENSIONS = [
  'intent_fit',
  'visual_structure',
  'content_narrative',
  'light_color',
  'timing_relationship',
  'craft',
  'voice_originality',
] as const;

export const PHOTO_STRATEGIES = [
  'single_subject',
  'layered_ambiguous',
  'minimal_space',
  'geometric',
  'environmental_portrait',
  'decisive_moment',
  'color_light',
  'conceptual',
  'unclear',
] as const;

export type PhotoStrategy = (typeof PHOTO_STRATEGIES)[number];

export type ProfessionalDimension = (typeof PROFESSIONAL_DIMENSIONS)[number];

export type ProfessionalProfile = {
  id: 'general' | 'street_documentary' | 'landscape_nature' | 'portrait' | 'urban_space' | 'experimental_abstract';
  label: string;
  weights: Record<ProfessionalDimension, number>;
};

const BASE_WEIGHTS: Record<ProfessionalDimension, number> = {
  intent_fit: 0.2,
  visual_structure: 0.2,
  content_narrative: 0.2,
  light_color: 0.15,
  timing_relationship: 0.1,
  craft: 0.1,
  voice_originality: 0.05,
};

const PROFILES: Record<ProfessionalProfile['id'], ProfessionalProfile> = {
  general: { id: 'general', label: '通用摄影阅读', weights: BASE_WEIGHTS },
  street_documentary: {
    id: 'street_documentary',
    label: '街头 / 纪实',
    weights: {
      intent_fit: 0.2,
      visual_structure: 0.2,
      content_narrative: 0.2,
      light_color: 0.15,
      timing_relationship: 0.15,
      craft: 0.05,
      voice_originality: 0.05,
    },
  },
  landscape_nature: {
    id: 'landscape_nature',
    label: '风光 / 自然',
    weights: {
      intent_fit: 0.15,
      visual_structure: 0.25,
      content_narrative: 0.15,
      light_color: 0.2,
      timing_relationship: 0.05,
      craft: 0.1,
      voice_originality: 0.1,
    },
  },
  portrait: {
    id: 'portrait',
    label: '人像 / 环境人像',
    weights: {
      intent_fit: 0.25,
      visual_structure: 0.2,
      content_narrative: 0.2,
      light_color: 0.15,
      timing_relationship: 0.1,
      craft: 0.05,
      voice_originality: 0.05,
    },
  },
  urban_space: {
    id: 'urban_space',
    label: '城市空间 / 建筑',
    weights: {
      intent_fit: 0.15,
      visual_structure: 0.3,
      content_narrative: 0.15,
      light_color: 0.15,
      timing_relationship: 0.05,
      craft: 0.15,
      voice_originality: 0.05,
    },
  },
  experimental_abstract: {
    id: 'experimental_abstract',
    label: '实验 / 抽象',
    weights: {
      intent_fit: 0.3,
      visual_structure: 0.2,
      content_narrative: 0.2,
      light_color: 0.1,
      timing_relationship: 0,
      craft: 0.05,
      voice_originality: 0.15,
    },
  },
};

export type EvaluationContext = {
  strategy: PhotoStrategy;
  strategy_confidence: number;
  severe_issue: boolean;
};

export type ProfessionalScoreInput = {
  dimension: ProfessionalDimension;
  score: number;
  confidence: number;
};

export type ProfessionalScoreResult = {
  raw: number;
  adjusted: number;
  confidence: number;
  floorApplied: boolean;
  floor: number | null;
  authorAdjustment: number;
};

export type AuthorInfluence = {
  status: 'identified' | 'possible' | 'unknown';
  confidence: number;
};

export function getProfessionalProfile(genre?: string | null): ProfessionalProfile {
  if (!genre) return PROFILES.general;
  if (genre in PROFILES) return PROFILES[genre as ProfessionalProfile['id']];
  if (genre.includes('街头') || genre.includes('纪实')) return PROFILES.street_documentary;
  if (genre.includes('风光') || genre.includes('自然')) return PROFILES.landscape_nature;
  if (genre.includes('人像')) return PROFILES.portrait;
  if (genre.includes('城市')) return PROFILES.urban_space;
  if (genre.includes('实验') || genre.includes('抽象')) return PROFILES.experimental_abstract;
  return PROFILES.general;
}

export function calculateProfessionalScore(
  scores: ProfessionalScoreInput[],
  profile: ProfessionalProfile,
  context: EvaluationContext,
  author?: AuthorInfluence,
): ProfessionalScoreResult {
  let weightedTotal = 0;
  let activeWeight = 0;
  let confidenceTotal = 0;

  for (const score of scores) {
    const weight = profile.weights[score.dimension];
    if (!weight || score.confidence <= 0 || !Number.isFinite(score.score)) continue;
    weightedTotal += Math.max(0, Math.min(100, score.score)) * weight;
    activeWeight += weight;
    confidenceTotal += score.confidence * weight;
  }

  const weightedScore = activeWeight > 0 ? Math.round(weightedTotal / activeWeight) : 0;
  const voiceScore = scores.find((score) => score.dimension === 'voice_originality');
  // A confident visual attribution changes how much the author's voice is
  // considered, but can only move the result by three points. A guess never
  // changes the score.
  const authorAdjustment = author?.status === 'identified'
    && author.confidence >= 0.82
    && voiceScore
    && voiceScore.confidence > 0
    ? Math.max(-3, Math.min(3, Math.round((voiceScore.score - 50) / 20)))
    : 0;
  const confidence = activeWeight > 0 ? confidenceTotal / activeWeight : 0;
  const canProtectConfidence = !context.severe_issue
    && context.strategy !== 'unclear'
    && context.strategy_confidence >= 0.55
    && confidence >= 0.55;
  // A small calibration lift keeps coherent photographs from clustering at
  // the discouraging edge of the scale while preserving evidenced low scores.
  const calibrationLift = canProtectConfidence && weightedScore >= 70 ? 2 : 0;
  const raw = Math.max(0, Math.min(100, weightedScore + authorAdjustment + calibrationLift));
  const floor = canProtectConfidence ? 72 : null;
  const adjusted = floor !== null ? Math.max(raw, floor) : raw;

  return {
    raw,
    adjusted,
    confidence,
    floorApplied: floor !== null && adjusted !== raw,
    floor,
    authorAdjustment,
  };
}

export function normalizeStrategy(value: unknown): PhotoStrategy {
  if (typeof value !== 'string' || !value.trim()) return 'unclear';
  const normalized = value.trim();
  return (PHOTO_STRATEGIES as readonly string[]).includes(normalized)
    ? normalized as PhotoStrategy
    : 'unclear';
}

export function normalizeEvaluationContext(value: unknown): EvaluationContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { strategy: 'unclear', strategy_confidence: 0, severe_issue: false };
  }
  const source = value as Record<string, unknown>;
  return {
    strategy: normalizeStrategy(source.strategy),
    strategy_confidence: typeof source.strategy_confidence === 'number'
      ? Math.max(0, Math.min(1, source.strategy_confidence))
      : 0,
    severe_issue: source.severe_issue === true,
  };
}
