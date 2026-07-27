import {
  collectRenderableAnnotations,
  validateAnalysisResult,
} from "/src/validator.mjs";

const dimensionNames = {
  composition: "构图",
  light: "光线",
  color_tone: "色彩与影调",
  narrative: "叙事",
  technical: "技术质量",
};

const evaluationCriteria = [
  ["subject_accuracy", "主体框准确"],
  ["line_restraint", "引导线克制"],
  ["crop_conservative", "裁切保守"],
  ["copy_specific", "文案具体"],
  ["copy_non_template", "非模板化"],
  ["low_confidence_hidden", "低置信度隐藏"],
];

const state = {
  dataset: null,
  photo: null,
  result: null,
  layers: new Set(["subject", "line", "crop"]),
  evaluations: JSON.parse(localStorage.getItem("photo-mentor-evaluations") ?? "{}"),
};

const byId = (id) => document.getElementById(id);

function setStatus(message, error = false) {
  const target = byId("status");
  target.textContent = message;
  target.classList.toggle("error", error);
}

function renderList() {
  const ready = state.dataset.photos.filter((photo) => photo.ready).length;
  byId("dataset-summary").textContent =
    `数据集 ${state.dataset.dataset_version} · ${ready}/${state.dataset.photos.length} 张照片已就绪`;
  byId("photo-list").replaceChildren(
    ...state.dataset.photos.map((photo) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = !photo.ready;
      button.classList.toggle("active", photo.id === state.photo?.id);
      button.innerHTML = `${photo.title}<small>${photo.context} · ${photo.challenge}</small>`;
      if (photo.ready) button.addEventListener("click", () => selectPhoto(photo));
      item.append(button);
      return item;
    }),
  );
}

function makeSvgElement(name, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

function renderAnnotations() {
  const overlay = byId("overlay");
  overlay.replaceChildren();
  const notes = [];
  for (const item of collectRenderableAnnotations(state.result ?? {})) {
    if (!state.layers.has(item.kind)) continue;
    if (item.kind === "line") {
      overlay.append(
        makeSvgElement("polyline", {
          class: "line-shape",
          points: item.points.map(([x, y]) => `${x},${y}`).join(" "),
        }),
      );
    } else {
      overlay.append(
        makeSvgElement("rect", {
          class: item.kind === "subject" ? "subject-shape" : "crop-shape",
          x: item.box.x,
          y: item.box.y,
          width: item.box.width,
          height: item.box.height,
        }),
      );
    }
    notes.push(`${item.label} · 置信度 ${Math.round(item.confidence * 100)}%：${item.rationale}`);
  }
  for (const collection of [
    state.result?.subject_boxes,
    state.result?.leading_lines,
    state.result?.crop_boxes,
  ]) {
    for (const item of collection ?? []) {
      if (item.decision === "omit") {
        notes.push(`不画「${item.label}」：${item.omit_reason}`);
      }
    }
  }
  byId("annotation-notes").replaceChildren(
    ...notes.map((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      return item;
    }),
  );
}

function renderTextList(id, values) {
  byId(id).replaceChildren(
    ...(values ?? []).map((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      return item;
    }),
  );
}

function renderEvaluation() {
  const saved = state.evaluations[state.photo.id] ?? {};
  byId("evaluation-fields").replaceChildren(
    ...evaluationCriteria.map(([key, label]) => {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      const select = document.createElement("select");
      select.dataset.criterion = key;
      select.innerHTML = `
        <option value="">未评</option>
        <option value="0">0 · 错误 / 误导</option>
        <option value="1">1 · 部分可用</option>
        <option value="2">2 · 准确 / 克制</option>`;
      select.value = saved[key] ?? "";
      wrapper.append(select);
      return wrapper;
    }),
  );
  byId("evaluation-notes").value = saved.notes ?? "";
}

function renderResult(validation) {
  byId("overall-score").textContent = state.result.overall_score;
  const rawScore = state.result.model_overall_score;
  const scoreNote = Number.isInteger(rawScore)
    ? `总分由五个分项算术平均计算；模型原始总分：${rawScore}。`
    : "总分由五个分项算术平均计算。";
  byId("score-summary").textContent = `${state.result.score_summary} ${scoreNote}`;
  byId("dimension-scores").replaceChildren(
    ...state.result.dimension_scores.map((item) => {
      const row = document.createElement("div");
      row.className = "dimension-row";
      row.innerHTML = `
        <header><strong>${dimensionNames[item.dimension]}</strong><span>${item.score} · ${Math.round(item.confidence * 100)}%</span></header>
        <p>${item.evidence}</p>
        <p class="suggestion">${item.suggestion}</p>`;
      return row;
    }),
  );
  const errors = validation.errors.length ? validation.errors : ["结构与语义校验通过"];
  byId("validation-errors").replaceChildren(
    ...errors.map((error) => {
      const item = document.createElement("li");
      item.textContent = error;
      return item;
    }),
  );
  renderTextList("observations", state.result.observations);
  renderTextList("interpretations", state.result.interpretations);
  byId("judgments").replaceChildren(
    ...state.result.subjective_judgments.map((item) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `<p>${item.judgment}</p><p class="alternative">另一种理解：${item.alternative_reading}</p>`;
      return wrapper;
    }),
  );
  byId("suggestions").replaceChildren(
    ...state.result.suggestions.map((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = "suggestion-card";
      wrapper.innerHTML = `<strong>${item.action}</strong><span>为什么：${item.why}</span><span>如何验证：${item.verification}</span>`;
      return wrapper;
    }),
  );
  renderAnnotations();
  renderEvaluation();
}

async function selectPhoto(photo) {
  state.photo = photo;
  renderList();
  byId("photo-context").textContent = `${photo.context} · ${photo.id}`;
  byId("photo-title").textContent = photo.title;
  byId("photo-challenge").textContent = `能力挑战：${photo.challenge}`;
  byId("photo-rights").textContent = `${photo.source} · ${photo.rights}`;
  const image = byId("photo");
  image.src = photo.image_path;
  image.alt = `${photo.title}，固定公共领域评测照片`;
  image.hidden = false;
  byId("missing-photo").hidden = true;

  try {
    const response = await fetch(photo.result_path);
    if (!response.ok) throw new Error(`无法读取结果：HTTP ${response.status}`);
    state.result = await response.json();
    const validation = validateAnalysisResult(state.result);
    renderResult(validation);
    setStatus(
      validation.valid
        ? "固定 mock JSON 已通过校验；请人工判断框线与文字是否靠谱。"
        : `结果有 ${validation.errors.length} 个问题，已阻止误导性坐标进入正式流程。`,
      !validation.valid,
    );
  } catch (error) {
    setStatus(error.message, true);
  }
}

function saveEvaluation() {
  const record = {
    photo_id: state.photo.id,
    evaluation_id: state.result.evaluation_id,
    evaluated_at: new Date().toISOString(),
    notes: byId("evaluation-notes").value.trim(),
  };
  for (const select of document.querySelectorAll("[data-criterion]")) {
    record[select.dataset.criterion] = select.value;
  }
  state.evaluations[state.photo.id] = record;
  localStorage.setItem("photo-mentor-evaluations", JSON.stringify(state.evaluations));
  setStatus("本照片人工评估已保存在当前浏览器；可随时导出 CSV。");
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const columns = [
    "photo_id",
    "evaluation_id",
    ...evaluationCriteria.map(([key]) => key),
    "notes",
    "evaluated_at",
  ];
  const rows = Object.values(state.evaluations);
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((key) => csvEscape(row[key])).join(",")),
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv" }));
  link.download = "photo-mentor-human-evaluation.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus(`已导出 ${rows.length} 条人工评估。`);
}

async function importJson(file) {
  try {
    const input = JSON.parse(await file.text());
    const validation = validateAnalysisResult(input);
    if (input.photo_id !== state.photo.id) {
      validation.errors.unshift(
        `photo_id 为 ${input.photo_id}，与当前照片 ${state.photo.id} 不一致`,
      );
      validation.valid = false;
    }
    if (!validation.valid) {
      byId("validation-errors").replaceChildren(
        ...validation.errors.map((error) => {
          const item = document.createElement("li");
          item.textContent = error;
          return item;
        }),
      );
      setStatus(`导入失败：${validation.errors.length} 个校验问题，未渲染坐标。`, true);
      return;
    }
    state.result = input;
    renderResult(validation);
    setStatus("导入 JSON 已通过校验并覆盖当前 mock 预览。");
  } catch (error) {
    setStatus(`无法导入 JSON：${error.message}`, true);
  }
}

for (const checkbox of document.querySelectorAll("[data-layer]")) {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) state.layers.add(checkbox.dataset.layer);
    else state.layers.delete(checkbox.dataset.layer);
    renderAnnotations();
  });
}
byId("save-evaluation").addEventListener("click", saveEvaluation);
byId("export-csv").addEventListener("click", exportCsv);
byId("json-file").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importJson(file);
  event.target.value = "";
});

try {
  const response = await fetch("dataset.json");
  state.dataset = await response.json();
  const firstReady = state.dataset.photos.find((photo) => photo.ready);
  await selectPhoto(firstReady);
} catch (error) {
  setStatus(`实验台初始化失败：${error.message}`, true);
}
