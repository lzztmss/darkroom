export const DRAW_THRESHOLD = 0.55;
export const MAX_CROP_LOSS = 0.25;

const DIMENSIONS = [
  "composition",
  "light",
  "color_tone",
  "narrative",
  "technical",
];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isUnit(value) {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function validateBox(box, path, errors) {
  if (!box || !["x", "y", "width", "height"].every((key) => isUnit(box[key]))) {
    errors.push(`${path} 必须包含 0 到 1 的 x/y/width/height`);
    return;
  }
  if (box.width <= 0 || box.height <= 0) {
    errors.push(`${path} 的宽高必须大于 0`);
  }
  if (box.x + box.width > 1 || box.y + box.height > 1) {
    errors.push(`${path} 超出照片边界`);
  }
}

function validateDecision(item, path, geometryKey, errors) {
  if (!["draw", "omit"].includes(item?.decision)) {
    errors.push(`${path}.decision 必须是 draw 或 omit`);
    return;
  }
  if (!isUnit(item.confidence)) {
    errors.push(`${path}.confidence 必须是 0 到 1`);
  }
  if (typeof item.rationale !== "string" || !item.rationale.trim()) {
    errors.push(`${path}.rationale 不能为空`);
  }
  if (item.decision === "draw") {
    if (item.confidence < DRAW_THRESHOLD) {
      errors.push(`${path} 置信度低于 ${DRAW_THRESHOLD}，必须返回不画`);
    }
    if (item[geometryKey] == null) {
      errors.push(`${path}.${geometryKey} 在 draw 时不能为空`);
    }
    if (item.omit_reason != null) {
      errors.push(`${path}.omit_reason 在 draw 时必须为 null`);
    }
  } else {
    if (item[geometryKey] !== null) {
      errors.push(`${path}.${geometryKey} 在 omit 时必须为 null`);
    }
    if (typeof item.omit_reason !== "string" || !item.omit_reason.trim()) {
      errors.push(`${path}.omit_reason 在 omit 时不能为空`);
    }
  }
}

function validateTextList(value, path, errors) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    errors.push(`${path} 必须是非空字符串数组`);
  }
}

export function validateAnalysisResult(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["结果必须是 JSON 对象"] };
  }

  for (const key of [
    "schema_version",
    "evaluation_id",
    "photo_id",
    "score_summary",
  ]) {
    if (typeof input[key] !== "string" || !input[key].trim()) {
      errors.push(`${key} 不能为空`);
    }
  }

  if (
    !Number.isInteger(input.overall_score) ||
    input.overall_score < 0 ||
    input.overall_score > 100
  ) {
    errors.push("overall_score 必须是 0 到 100 的整数");
  }

  if (!input.model || typeof input.model !== "object") {
    errors.push("model 元数据不能为空");
  } else {
    for (const key of ["provider", "name", "version", "prompt_version"]) {
      if (typeof input.model[key] !== "string" || !input.model[key].trim()) {
        errors.push(`model.${key} 不能为空`);
      }
    }
  }

  if (!Array.isArray(input.dimension_scores)) {
    errors.push("dimension_scores 必须是数组");
  } else {
    const names = input.dimension_scores.map((item) => item.dimension);
    if (
      names.length !== DIMENSIONS.length ||
      DIMENSIONS.some((name) => !names.includes(name))
    ) {
      errors.push(`dimension_scores 必须且只能包含 ${DIMENSIONS.join(", ")}`);
    }
    input.dimension_scores.forEach((item, index) => {
      const path = `dimension_scores[${index}]`;
      if (!Number.isInteger(item.score) || item.score < 0 || item.score > 100) {
        errors.push(`${path}.score 必须是 0 到 100 的整数`);
      }
      for (const key of ["evidence", "suggestion"]) {
        if (typeof item[key] !== "string" || !item[key].trim()) {
          errors.push(`${path}.${key} 不能为空`);
        }
      }
      if (!isUnit(item.confidence)) {
        errors.push(`${path}.confidence 必须是 0 到 1`);
      }
    });
  }

  for (const collection of ["subject_boxes", "leading_lines", "crop_boxes"]) {
    if (!Array.isArray(input[collection]) || input[collection].length === 0) {
      errors.push(`${collection} 必须至少包含一个 draw 或 omit 判断`);
    }
  }

  (input.subject_boxes ?? []).forEach((item, index) => {
    const path = `subject_boxes[${index}]`;
    validateDecision(item, path, "box", errors);
    if (item.decision === "draw") validateBox(item.box, `${path}.box`, errors);
  });

  (input.leading_lines ?? []).forEach((item, index) => {
    const path = `leading_lines[${index}]`;
    validateDecision(item, path, "points", errors);
    if (item.decision === "draw") {
      if (
        !Array.isArray(item.points) ||
        item.points.length < 2 ||
        item.points.some(
          (point) =>
            !Array.isArray(point) ||
            point.length !== 2 ||
            !isUnit(point[0]) ||
            !isUnit(point[1]),
        )
      ) {
        errors.push(`${path}.points 必须包含至少两个归一化坐标点`);
      }
    }
  });

  (input.crop_boxes ?? []).forEach((item, index) => {
    const path = `crop_boxes[${index}]`;
    validateDecision(item, path, "box", errors);
    if (item.decision === "draw") validateBox(item.box, `${path}.box`, errors);
    if (!isUnit(item.loss_ratio) || item.loss_ratio > MAX_CROP_LOSS) {
      errors.push(`${path}.loss_ratio 裁切损失必须在 0 到 ${MAX_CROP_LOSS} 之间`);
    }
    if (typeof item.preserves_intent !== "string" || !item.preserves_intent.trim()) {
      errors.push(`${path}.preserves_intent 不能为空`);
    }
  });

  validateTextList(input.observations, "observations", errors);
  validateTextList(input.interpretations, "interpretations", errors);

  if (
    !Array.isArray(input.subjective_judgments) ||
    input.subjective_judgments.length === 0 ||
    input.subjective_judgments.some(
      (item) =>
        typeof item?.judgment !== "string" ||
        !item.judgment.trim() ||
        typeof item?.alternative_reading !== "string" ||
        !item.alternative_reading.trim(),
    )
  ) {
    errors.push("subjective_judgments 必须包含判断和替代解读");
  }

  if (!Array.isArray(input.suggestions) || input.suggestions.length === 0) {
    errors.push("suggestions 必须是非空数组");
  } else {
    input.suggestions.forEach((item, index) => {
      for (const key of ["type", "action", "why", "verification"]) {
        if (typeof item[key] !== "string" || !item[key].trim()) {
          errors.push(`suggestions[${index}].${key} 不能为空`);
        }
      }
      if (!isUnit(item.confidence)) {
        errors.push(`suggestions[${index}].confidence 必须是 0 到 1`);
      }
    });
  }

  if (!input.confidence || typeof input.confidence !== "object") {
    errors.push("confidence 不能为空");
  } else {
    for (const key of [
      "overall",
      "subject_boxes",
      "leading_lines",
      "crop_boxes",
    ]) {
      if (!isUnit(input.confidence[key])) {
        errors.push(`confidence.${key} 必须是 0 到 1`);
      }
    }
  }

  if (!Array.isArray(input.safety_flags)) {
    errors.push("safety_flags 必须是数组");
  }

  return { valid: errors.length === 0, errors };
}

export function collectRenderableAnnotations(input) {
  const output = [];
  const add = (items, kind, geometryKey) => {
    for (const item of items ?? []) {
      if (
        item.decision === "draw" &&
        item.confidence >= DRAW_THRESHOLD &&
        item[geometryKey] != null
      ) {
        output.push({ kind, ...item });
      }
    }
  };
  add(input.subject_boxes, "subject", "box");
  add(input.leading_lines, "line", "points");
  add(input.crop_boxes, "crop", "box");
  return output;
}
