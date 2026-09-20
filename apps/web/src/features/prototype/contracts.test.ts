import { describe, expect, it } from 'vitest';

import { CritiqueResultSchema, scoreTone } from './contracts';
import { prototypeCritique } from './fixtures';

describe('critique result contract', () => {
  it('accepts one total score and exactly five scored dimensions', () => {
    const result = CritiqueResultSchema.parse(prototypeCritique);
    expect(result.overallScore).toBe(82);
    expect(result.dimensions).toHaveLength(5);
    expect(result.dimensions.map(({ key }) => key)).toEqual([
      'composition',
      'lighting',
      'color_tone',
      'narrative',
      'technical',
    ]);
  });

  it('rejects scores outside 0 through 100', () => {
    const result = CritiqueResultSchema.safeParse({ ...prototypeCritique, overallScore: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects reshoot versions because feedback never requires a comparison upload', () => {
    const result = CritiqueResultSchema.safeParse({
      ...prototypeCritique,
      reshootVersions: [{ imageUrl: '/images/after.jpg' }],
    });
    expect(result.success).toBe(false);
  });

  it.each([
    [85, 'high'],
    [84, 'mid'],
    [75, 'mid'],
    [74, 'low'],
  ] as const)('maps %i to the restrained score tone %s', (score, tone) => {
    expect(scoreTone(score)).toBe(tone);
  });
});
