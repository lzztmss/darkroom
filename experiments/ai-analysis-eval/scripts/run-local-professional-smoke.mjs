import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const fixtureName = process.env.PHOTO_MENTOR_SMOKE_FIXTURE ?? "ansel-adams-tetons-snake-river.jpg";
const fixtures = {
  "ansel-adams-tetons-snake-river.jpg": { width: 1200, height: 972, genre: "风光" },
  "railway-cars-arizona.jpg": { width: 620, height: 451, genre: "街头 / 纪实" },
};
const fixture = fixtures[fixtureName];
if (!fixture) throw new Error(`不支持的公开领域评测样例：${fixtureName}`);
const photoPath = resolve(root, "experiments/ai-analysis-eval/public/photos", fixtureName);
const dataUrl = `data:image/jpeg;base64,${(await readFile(photoPath)).toString("base64")}`;

const response = await fetch("http://127.0.0.1:4174/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    image: {
      dataUrl,
      width: fixture.width,
      height: fixture.height,
      name: "photo-eval-001.jpg",
    },
    context: {
      genre: fixture.genre,
      intent: "",
      focus: [],
    },
  }),
});

const payload = await response.json();
if (!response.ok) throw new Error(JSON.stringify(payload));

const result = payload.result;
const summary = {
  photo_id: result.photo_id,
  model: result.model,
  overall_score: result.overall_score,
  overall_score_method: result.overall_score_method,
  evaluation_context: result.evaluation_context,
  professional_scores: result.professional_scores?.map(({ dimension, score, confidence }) => ({
    dimension,
    score,
    confidence,
  })),
  subject_annotations: result.subject_boxes?.map(({ label, decision, confidence, omit_reason }) => ({
    label,
    decision,
    confidence,
    omit_reason,
  })),
  leading_line_annotations: result.leading_lines?.map(({ label, decision, confidence, omit_reason }) => ({
    label,
    decision,
    confidence,
    omit_reason,
  })),
  legacy_dimension_count: result.dimension_scores?.length,
};

const outputPath = "/tmp/photo-mentor-professional-smoke.json";
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ...summary }, null, 2));
