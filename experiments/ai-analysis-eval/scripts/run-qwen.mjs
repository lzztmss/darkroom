import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateOverallScore,
  validateAnalysisResult,
} from "../src/validator.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = resolve(root, "public");
const model = process.env.PHOTO_MENTOR_MODEL ?? "qwen3.7-plus-2026-05-26";
const baseUrl =
  process.env.DASHSCOPE_BASE_URL ??
  "https://dashscope.aliyuncs.com/compatible-mode/v1";

function getArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const photoId = getArg("photo", "landscape-s-curve");
const dataset = JSON.parse(await readFile(resolve(publicRoot, "dataset.json"), "utf8"));
const photo = dataset.photos.find((item) => item.id === photoId);

if (!photo?.ready) {
  throw new Error(`找不到已就绪照片：${photoId}`);
}
if (!process.env.DASHSCOPE_API_KEY) {
  throw new Error("缺少 DASHSCOPE_API_KEY。请把 Key 放在本地 .env 文件，不要写进代码。");
}

const imagePath = resolve(publicRoot, photo.image_path);
const imageBase64 = (await readFile(imagePath)).toString("base64");
const schema = await readFile(
  resolve(root, "schema/analysis-result.schema.json"),
  "utf8",
);
const prompt = `
请分析照片 ${photo.id}，摄影语境是“${photo.context}”。
这是能力验证，不是生成或修改照片。只返回 JSON，不要 Markdown 代码围栏。

必须严格区分 observations（可直接观察事实）、interpretations（摄影知识解释）、
subjective_judgments（主观判断和 alternative_reading）和 suggestions（可执行建议）。
坐标要使用 0 到 1 的归一化数值；主体框位置置信度低于 0.55 时必须 decision=omit；引导线置信度低于 0.85 时必须 decision=omit，几何字段为 null。
没有可靠主体、引导线或裁切时，明确返回 omit，不要为了满足格式乱画。
每个建议必须回答改什么、为什么、如何验证；不要新增、移除或替换真实物体。

JSON Schema：
${schema}
`;

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "你是严格遵守摄影评价质量规则的中文摄影教练。",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: { type: "json_object" },
  }),
});

const payload = await response.json();
if (!response.ok) {
  throw new Error(`百炼请求失败 (${response.status})：${JSON.stringify(payload)}`);
}

const content = payload.choices?.[0]?.message?.content;
if (typeof content !== "string") {
  throw new Error("百炼响应中没有可解析的 JSON 文本。");
}

let result;
try {
  result = JSON.parse(content);
} catch {
  throw new Error(`模型返回的内容不是 JSON：${content.slice(0, 500)}`);
}

const modelOverallScore = result.overall_score;
result.model_overall_score = Number.isInteger(modelOverallScore)
  ? modelOverallScore
  : null;
result.overall_score_method = "mean_of_dimensions_v1";
const calculatedOverallScore = calculateOverallScore(result.dimension_scores);
if (calculatedOverallScore !== null) result.overall_score = calculatedOverallScore;

const validation = validateAnalysisResult(result);
const outputPath = resolve(
  publicRoot,
  "results",
  `${photo.id}-${model.replaceAll("/", "-")}.json`,
);
if (!validation.valid) {
  throw new Error(`模型 JSON 未通过校验：\n${validation.errors.join("\n")}`);
}

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`通过校验，已保存：${outputPath}`);
console.log(`模型：${model}`);
console.log(`照片：${basename(imagePath)}，输入约 ${imageBase64.length} 个 Base64 字符`);
