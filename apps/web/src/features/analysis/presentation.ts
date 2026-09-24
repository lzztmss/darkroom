export type ScoreTone = 'high' | 'mid' | 'low';

export function scoreTone(score: number): ScoreTone {
  if (score >= 85) return 'high';
  if (score >= 75) return 'mid';
  return 'low';
}
