import { describe, expect, it } from 'vitest';
import {
  calculateOverallScore,
  cleanScoreSummary,
  normalizeAnalysisResult,
  normalizeBox,
  normalizePreservesIntent,
  normalizeScoreScale,
} from './contract';

function makeAnalysisInput() {
  return {
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
    crop_boxes: [{
      id: 'crop-1', label: '保留原图', decision: 'omit', rationale: '复合构图不宜收紧', confidence: 0.8,
      omit_reason: '复合构图不宜收紧', box: null, loss_ratio: 0, preserves_intent: '保留主体关系',
    }],
    observations: ['可见事实'],
    interpretations: ['摄影解释'],
    subjective_judgments: [{ judgment: '主观判断', alternative_reading: '另一种理解' }],
    suggestions: [{ type: 'crop_review', action: '比较原图', why: '避免过度裁切', verification: '切换预览', confidence: 0.8 }],
    confidence: { overall: 0.8, subject_boxes: 0.4, leading_lines: 0.4, crop_boxes: 0.8 },
    safety_flags: [],
  };
}

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
    const base = makeAnalysisInput();

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

    const emptyAnnotationsResult = normalizeAnalysisResult({
      ...base,
      leading_lines: [],
      crop_boxes: [],
    });
    expect(emptyAnnotationsResult.leading_lines).toEqual([expect.objectContaining({
      decision: 'omit',
      points: null,
      omit_reason: '模型未返回可靠引导线，已隐藏线条',
    })]);
    expect(emptyAnnotationsResult.crop_boxes).toEqual([expect.objectContaining({
      decision: 'omit',
      box: null,
      loss_ratio: 0,
      omit_reason: '模型未返回可靠裁切方案，已保留原构图',
    })]);

    const unsafeCropResult = normalizeAnalysisResult({
      ...base,
      crop_boxes: [{
        id: 'crop-1', label: '过大裁切', decision: 'draw', rationale: '裁掉边缘', confidence: 0.9,
        box: { x: 0.1, y: 0.1, width: 0.9, height: 0.9 }, loss_ratio: 0.3, preserves_intent: '不确定',
      }],
    });
    expect(unsafeCropResult.crop_boxes.at(0)).toEqual(expect.objectContaining({
      decision: 'omit',
      box: null,
      loss_ratio: 0,
      omit_reason: '模型返回的裁切损失超过 25%，已保留原构图',
    }));
  });

  it('hides a leading line when its confidence is below 85 percent', () => {
    const result = normalizeAnalysisResult({
      ...makeAnalysisInput(),
      leading_lines: [{
        id: 'line-1', label: '金属管线', decision: 'draw', rationale: '可能形成方向', confidence: 0.84,
        omit_reason: null, points: [[0.1, 0.9], [0.8, 0.2]],
      }],
    });

    expect(result.leading_lines[0]).toEqual(expect.objectContaining({
      decision: 'omit',
      points: null,
      omit_reason: '引导线置信度低于 85%，已隐藏线条',
    }));
  });

  it('weights professional dimensions by genre and excludes an unassessed intent', () => {
    const professionalScores = [
      'intent_fit',
      'visual_structure',
      'content_narrative',
      'light_color',
      'timing_relationship',
      'craft',
      'voice_originality',
    ].map((dimension) => ({
      dimension,
      score: dimension === 'intent_fit' ? 92 : 58,
      evidence: dimension === 'intent_fit' ? '模型误评了未提供的意图' : '可见证据',
      suggestion: '保持克制',
      confidence: dimension === 'intent_fit' ? 0.9 : 0.8,
    }));

    const result = normalizeAnalysisResult({
      ...makeAnalysisInput(),
      dimension_scores: undefined,
      professional_scores: professionalScores,
      evaluation_context: {
        profile: 'general',
        profile_label: '通用摄影阅读',
        strategy: 'layered_ambiguous',
        strategy_confidence: 0.82,
        intent_status: 'supported',
        severe_issue: false,
        floor_applied: false,
        raw_score: 0,
      },
    }, { genre: '街头', intentProvided: false });

    expect(result.overall_score_method).toBe('weighted_context_v1');
    expect(result.overall_score).toBe(72);
    expect(result.evaluation_context).toEqual(expect.objectContaining({
      profile: 'street_documentary',
      intent_status: 'not_provided',
      floor_applied: true,
      raw_score: 58,
    }));
    expect(result.professional_scores?.find((item) => item.dimension === 'intent_fit')).toEqual(expect.objectContaining({
      score: 0,
      confidence: 0,
    }));
    expect(result.confidence.overall).toBeCloseTo(0.8);
    expect(result.dimension_scores).toHaveLength(5);
  });

  it('upgrades legacy scores and hides unsafe boxes for a composite street frame', () => {
    const input = {
      ...makeAnalysisInput(),
      overall_score: 67,
      dimension_scores: ['composition', 'light', 'color_tone', 'narrative', 'technical'].map((dimension, index) => ({
        dimension,
        score: [62, 72, 65, 70, 66][index],
        evidence: '旧版可见证据',
        suggestion: '保留关系',
        confidence: 0.8,
      })),
      evaluation_context: {
        profile: 'street_documentary',
        profile_label: '街头 / 纪实',
        strategy: 'layered_ambiguous',
        strategy_confidence: 0.8,
        intent_status: 'not_provided',
        severe_issue: false,
        floor_applied: false,
        raw_score: 67,
      },
      subject_boxes: [
        { id: 'subject-a', label: '左侧人物', decision: 'draw', rationale: '人物可见', confidence: 0.9, omit_reason: null, box: { x: 0.05, y: 0.2, width: 0.2, height: 0.7 } },
        { id: 'subject-b', label: '中央人物', decision: 'draw', rationale: '人物可见', confidence: 0.9, omit_reason: null, box: { x: 0.35, y: 0.1, width: 0.3, height: 0.8 } },
      ],
    };
    const result = normalizeAnalysisResult(input, { genre: '街头', intentProvided: false });

    expect(result.overall_score_method).toBe('weighted_context_v1');
    expect(result.overall_score).toBe(72);
    expect(result.professional_scores).toHaveLength(7);
    expect(result.subject_boxes.every((item) => item.decision === 'omit')).toBe(true);
    expect(result.confidence.subject_boxes).toBe(0);

    const legacyStoredResult = normalizeAnalysisResult({ ...input, evaluation_context: undefined }, { intentProvided: false });
    expect(legacyStoredResult.overall_score).toBe(72);
    expect(legacyStoredResult.evaluation_context).toEqual(expect.objectContaining({
      strategy: 'layered_ambiguous',
      floor_applied: true,
    }));
  });

  it('defaults author recognition to unknown and downgrades an under-threshold claim', () => {
    const unknown = normalizeAnalysisResult(makeAnalysisInput());
    expect(unknown.author_attribution).toEqual(expect.objectContaining({
      status: 'unknown',
      primary_name: null,
      confidence: 0,
    }));

    const possible = normalizeAnalysisResult({
      ...makeAnalysisInput(),
      author_attribution: {
        status: 'identified',
        primary_name: 'Alex Webb',
        candidates: [{ name: 'Alex Webb', work: null, confidence: 0.7, evidence: '色彩相似' }],
        confidence: 0.7,
        evidence: '只有色彩相似，无法确认作者。',
        source: 'visual_match',
      },
    });
    expect(possible.author_attribution).toEqual(expect.objectContaining({
      status: 'possible',
      primary_name: 'Alex Webb',
    }));
    expect(possible.overall_score).toBe(70);
  });
});
