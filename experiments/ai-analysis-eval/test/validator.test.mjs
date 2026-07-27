import assert from "node:assert/strict";
import test from "node:test";

import {
  collectRenderableAnnotations,
  validateAnalysisResult,
} from "../src/validator.mjs";

function validResult() {
  return {
    schema_version: "1.0.0",
    evaluation_id: "eval-test",
    photo_id: "photo-test",
    model: {
      provider: "mock",
      name: "fixed-fixture",
      version: "1",
      prompt_version: "mock-v1",
    },
    overall_score: 78,
    score_summary: "总分只用于快速索引，画面仍有其他合理解读。",
    dimension_scores: [
      {
        dimension: "composition",
        score: 80,
        evidence: "主体位于画面中部偏左。",
        suggestion: "保持主体位置，比较右侧多留一点空间的版本。",
        confidence: 0.8,
      },
      {
        dimension: "light",
        score: 75,
        evidence: "主体与背景亮度接近。",
        suggestion: "下次等待主体进入更亮的区域，再比较分离度。",
        confidence: 0.75,
      },
      {
        dimension: "color_tone",
        score: 78,
        evidence: "冷暖关系较弱。",
        suggestion: "后期只轻微调整白平衡，并与原图并排比较。",
        confidence: 0.7,
      },
      {
        dimension: "narrative",
        score: 77,
        evidence: "人物与环境形成尺度关系。",
        suggestion: "下次多等一步，让人物和背景标志分开。",
        confidence: 0.74,
      },
      {
        dimension: "technical",
        score: 82,
        evidence: "主体边缘可辨识。",
        suggestion: "维持当前快门设置，并检查高光是否溢出。",
        confidence: 0.83,
      },
    ],
    subject_boxes: [
      {
        id: "subject-1",
        label: "主要人物",
        decision: "draw",
        box: { x: 0.2, y: 0.25, width: 0.2, height: 0.5 },
        rationale: "人物是画面中最清楚的视觉重心。",
        confidence: 0.82,
        omit_reason: null,
      },
    ],
    leading_lines: [
      {
        id: "line-1",
        label: "无法确认引导线",
        decision: "omit",
        points: null,
        rationale: "背景边缘不足以形成稳定视觉路径。",
        confidence: 0.42,
        omit_reason: "位置判断低于绘制阈值。",
      },
    ],
    crop_boxes: [
      {
        id: "crop-1",
        label: "保守收紧",
        decision: "draw",
        box: { x: 0.04, y: 0.04, width: 0.92, height: 0.92 },
        rationale: "只去掉四周少量空白。",
        confidence: 0.76,
        omit_reason: null,
        loss_ratio: 0.1536,
        preserves_intent: "保留人物与环境的尺度关系。",
      },
    ],
    observations: ["画面中部偏左有一名人物。"],
    interpretations: ["人物与环境的尺度差形成空间感。"],
    subjective_judgments: [
      {
        judgment: "较大的留白让画面显得安静。",
        alternative_reading: "也可认为留白削弱了人物动作的紧张感。",
      },
    ],
    suggestions: [
      {
        type: "next_shoot",
        action: "等待人物与背景标志分开后再拍一张。",
        why: "减少轮廓重叠，更容易确认人物动作。",
        verification: "并排比较两张照片中人物轮廓的可辨识程度。",
        confidence: 0.78,
      },
    ],
    confidence: {
      overall: 0.78,
      subject_boxes: 0.82,
      leading_lines: 0.42,
      crop_boxes: 0.76,
    },
    safety_flags: [],
  };
}

test("accepts a complete result with explicit omitted geometry", () => {
  const result = validateAnalysisResult(validResult());
  assert.deepEqual(result.errors, []);
});

test("rejects drawing a low-confidence annotation", () => {
  const input = validResult();
  input.subject_boxes[0].confidence = 0.4;

  const result = validateAnalysisResult(input);
  assert.ok(result.errors.some((error) => error.includes("低于 0.55")));
});

test("rejects geometry outside normalized coordinates", () => {
  const input = validResult();
  input.subject_boxes[0].box.width = 0.9;

  const result = validateAnalysisResult(input);
  assert.ok(result.errors.some((error) => error.includes("超出照片边界")));
});

test("rejects crop candidates that discard more than 25 percent", () => {
  const input = validResult();
  input.crop_boxes[0].loss_ratio = 0.4;

  const result = validateAnalysisResult(input);
  assert.ok(result.errors.some((error) => error.includes("裁切损失")));
});

test("renderer only returns annotations that are safe to draw", () => {
  const input = validResult();
  const annotations = collectRenderableAnnotations(input);

  assert.equal(annotations.length, 2);
  assert.deepEqual(
    annotations.map((annotation) => annotation.kind),
    ["subject", "crop"],
  );
});
