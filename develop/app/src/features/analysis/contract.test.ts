import { describe, expect, it } from 'vitest';
import {
  calculateOverallScore,
  cleanScoreSummary,
  normalizeAnalysisResult,
  normalizeBox,
  normalizePreservesIntent,
  normalizeScoreScale,
} from './contract';

describe('analysis contract helpers', () => {
  it('calculates the visible score from five dimensions', () => {
    expect(calculateOverallScore([{ score: 90 }, { score: 80 }, { score: 70 }, { score: 60 }, { score: 50 }])).toBe(70);
  });

  it('removes repeated score boilerplate from model copy', () => {
    expect(cleanScoreSummary('光线和空间关系清楚。总分由五个分项算术平均计算，仅作快速索引。')).toBe('光线和空间关系清楚。');
  });

  it('normalizes Qwen boolean crop intent values into readable text', () => {
    expect(normalizePreservesIntent(true)).toBe('保留创作意图');
    expect(normalizePreservesIntent(false)).toBe('可能改变创作意图');
  });

  it('only accepts the workbench x-y-width-height object contract', () => {
    expect(normalizeBox({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 })).toEqual({
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    });

    // Arrays are ambiguous: the last two values may be width/height or right/bottom.
    // Guessing here can put an apparently valid box over the wrong part of the photo.
    expect(normalizeBox([0.1, 0.2, 0.3, 0.4])).toBeNull();
  });

  it('rejects impossible boxes so annotations can degrade to text', () => {
    expect(normalizeBox([2, 2, 3, 3])).toBeNull();
  });

  it('converts a five-item ten-point scale into percentage scores', () => {
    expect(normalizeScoreScale([7, 7.5, 8, 6.5, 7])).toEqual([70, 75, 80, 65, 70]);
    expect(normalizeScoreScale([70, 75, 80, 65, 70])).toEqual([70, 75, 80, 65, 70]);
  });

  it('repairs a missing crop omit_reason according to the draw or omit decision', () => {
    const base = {
      schema_version: '1.0.0',
      evaluation_id: 'evaluation-1',
      photo_id: 'photo-1',
      model: { provider: 'qwen', name: 'qwen', version: '1', prompt_version: '1' },
      overall_score: 70,
      score_summary: '画面关系清楚。',
      dimension_scores: ['composition', 'light', 'color_tone', 'narrative', 'technical'].map((dimension) => ({
        dimension,
        score: 70,
        evidence: '可见证据',
        suggestion: '保持克制',
        confidence: 0.8,
      })),
      subject_boxes: [{
        id: 'subject-1', label: '主体', decision: 'omit', rationale: '主体不明确', confidence: 0.4, omit_reason: '主体不明确', box: null,
      }],
      leading_lines: [{
        id: 'line-1', label: '引导线', decision: 'omit', rationale: '没有可靠方向', confidence: 0.4, omit_reason: '没有可靠方向', points: null,
      }],
      observations: ['可见事实'],
      interpretations: ['摄影解释'],
      subjective_judgments: [{ judgment: '主观判断', alternative_reading: '另一种理解' }],
      suggestions: [{ type: 'crop_review', action: '比较原图', why: '避免过度裁切', verification: '切换预览', confidence: 0.8 }],
      confidence: { overall: 0.8, subject_boxes: 0.4, leading_lines: 0.4, crop_boxes: 0.8 },
      safety_flags: [],
    };

    const drawResult = normalizeAnalysisResult({
      ...base,
      crop_boxes: [{
        id: 'crop-1', label: '保守裁切', decision: 'draw', rationale: '去除少量边缘', confidence: 0.8,
        box: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }, loss_ratio: 0.19, preserves_intent: '保留主体关系',
      }],
    });
    expect(drawResult.crop_boxes.at(0)?.omit_reason).toBeNull();

    const omitResult = normalizeAnalysisResult({
      ...base,
      crop_boxes: [{
        id: 'crop-1', label: '保留原图', decision: 'omit', rationale: '复合构图不宜收紧', confidence: 0.8,
        box: null, loss_ratio: 0, preserves_intent: '保留主体关系',
      }],
    });
    expect(omitResult.crop_boxes.at(0)?.omit_reason).toBe('复合构图不宜收紧');
  });
});
