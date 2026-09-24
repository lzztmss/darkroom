import { describe, expect, it } from 'vitest';
import {
  calculateProfessionalScore,
  getProfessionalProfile,
  PROFESSIONAL_DIMENSIONS,
} from './professional-rubric';

describe('professional photography rubric', () => {
  it('uses a heavier timing profile for street photography', () => {
    const profile = getProfessionalProfile('街头');
    expect(profile.id).toBe('street_documentary');
    expect(profile.weights.timing_relationship).toBeGreaterThan(profile.weights.craft);
    expect(Object.keys(profile.weights)).toHaveLength(PROFESSIONAL_DIMENSIONS.length);
  });

  it('does not let unassessed intent create a fake low score', () => {
    const result = calculateProfessionalScore(
      PROFESSIONAL_DIMENSIONS.map((dimension) => ({
        dimension,
        score: dimension === 'intent_fit' ? 0 : 76,
        confidence: dimension === 'intent_fit' ? 0 : 0.8,
      })),
      getProfessionalProfile('街头'),
      { strategy: 'layered_ambiguous', strategy_confidence: 0.82, severe_issue: false },
    );

    expect(result.raw).toBe(76);
    expect(result.adjusted).toBe(76);
    expect(result.floorApplied).toBe(false);
  });

  it('protects a coherent photograph from an unjustified low score', () => {
    const result = calculateProfessionalScore(
      PROFESSIONAL_DIMENSIONS.map((dimension) => ({ dimension, score: 58, confidence: 0.8 })),
      getProfessionalProfile('街头'),
      { strategy: 'layered_ambiguous', strategy_confidence: 0.82, severe_issue: false },
    );

    expect(result.raw).toBe(58);
    expect(result.adjusted).toBe(70);
    expect(result.floorApplied).toBe(true);
  });

  it('keeps a low score when a severe issue is explicitly supported', () => {
    const result = calculateProfessionalScore(
      PROFESSIONAL_DIMENSIONS.map((dimension) => ({ dimension, score: 58, confidence: 0.8 })),
      getProfessionalProfile('街头'),
      { strategy: 'unclear', strategy_confidence: 0.8, severe_issue: true },
    );

    expect(result.adjusted).toBe(58);
    expect(result.floorApplied).toBe(false);
  });

  it('protects a usable reading when strategy confidence is moderate but evidence is consistent', () => {
    const result = calculateProfessionalScore(
      PROFESSIONAL_DIMENSIONS.map((dimension) => ({ dimension, score: 48, confidence: 0.6 })),
      getProfessionalProfile('城市空间'),
      { strategy: 'environmental_portrait', strategy_confidence: 0.6, severe_issue: false },
    );

    expect(result.adjusted).toBe(70);
    expect(result.floorApplied).toBe(true);
  });
});
