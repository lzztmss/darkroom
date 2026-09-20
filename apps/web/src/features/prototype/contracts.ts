import { z } from 'zod';

export const GenreSchema = z.enum([
  'documentary',
  'street',
  'portrait',
  'landscape',
  'urban',
  'uncertain',
]);
export type Genre = z.infer<typeof GenreSchema>;

const ScoreSchema = z.number().int().min(0).max(100);
const ConfidenceSchema = z.number().min(0).max(1);

export const NormalizedBoxSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .refine(({ x, width }) => x + width <= 1)
  .refine(({ y, height }) => y + height <= 1);

export const AdviceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  observation: z.string().min(1),
  interpretation: z.string().min(1),
  action: z.string().min(1),
  confidence: ConfidenceSchema,
});

export const DimensionAssessmentSchema = AdviceSchema.extend({
  key: z.enum(['composition', 'lighting', 'color_tone', 'narrative', 'technical']),
  label: z.enum(['构图', '光线', '色彩与影调', '叙事', '技术质量']),
  score: ScoreSchema,
});

export const AnnotationSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string(),
    layer: z.enum(['focus', 'composition']),
    kind: z.literal('rect'),
    box: NormalizedBoxSchema,
    label: z.string(),
    confidence: ConfidenceSchema,
    fallbackText: z.string(),
  }),
  z.object({
    id: z.string(),
    layer: z.literal('composition'),
    kind: z.literal('line'),
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1),
    label: z.string(),
    confidence: ConfidenceSchema,
    fallbackText: z.string(),
  }),
]);

export const CropCandidateSchema = z.object({
  id: z.string(),
  label: z.enum(['保守裁切', '明显重构']),
  box: NormalizedBoxSchema,
  aspectRatio: z.string(),
  reason: z.string(),
});

export const CritiqueResultSchema = z
  .object({
    id: z.string(),
    image: z.object({ src: z.string(), alt: z.string(), rights: z.string() }),
    intentSummary: z.string(),
    photoDescription: z.array(z.string().min(1)).min(2).max(4),
    overallScore: ScoreSchema,
    scoreSummary: z.string(),
    dimensions: z.array(DimensionAssessmentSchema).length(5),
    strengths: z.array(AdviceSchema).min(1).max(3),
    improvements: z.array(AdviceSchema).min(1).max(3),
    annotations: z.array(AnnotationSchema),
    cropCandidates: z.array(CropCandidateSchema).max(2),
    postProcessSuggestions: z
      .array(
        z.object({
          parameter: z.enum(['曝光', '白平衡', '对比', '高光', '阴影', '饱和度', '黑白']),
          delta: z.number().min(-100).max(100),
          reason: z.string(),
        }),
      )
      .max(6),
    nextShootSuggestions: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          action: z.string(),
          reason: z.string(),
        }),
      )
      .max(3),
    alternativeReading: z.string(),
    confidence: ConfidenceSchema,
  })
  .strict()
  .superRefine(({ dimensions }, context) => {
    if (new Set(dimensions.map(({ key }) => key)).size !== 5) {
      context.addIssue({
        code: 'custom',
        message: 'five score dimensions must be unique',
        path: ['dimensions'],
      });
    }
  });

export const FeedbackChoiceSchema = z.enum(['accurate', 'helpful', 'misunderstood', 'not_applicable']);
export type CritiqueResult = z.infer<typeof CritiqueResultSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type CropCandidate = z.infer<typeof CropCandidateSchema>;
export type FeedbackChoice = z.infer<typeof FeedbackChoiceSchema>;

export function scoreTone(score: number): 'high' | 'mid' | 'low' {
  if (score >= 85) return 'high';
  if (score >= 75) return 'mid';
  return 'low';
}
