import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAnalysisResult } from "../src/validator.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = resolve(root, "public");
const dataset = JSON.parse(
  await readFile(resolve(publicRoot, "dataset.json"), "utf8"),
);

let failed = false;
let readyCount = 0;

if (dataset.photos.length < 10 || dataset.photos.length > 20) {
  console.error(`数据集槽位必须为 10–20，当前为 ${dataset.photos.length}`);
  failed = true;
}

for (const photo of dataset.photos) {
  if (!photo.ready) continue;
  readyCount += 1;
  const imagePath = resolve(publicRoot, photo.image_path);
  const resultPath = resolve(publicRoot, photo.result_path);
  if (!existsSync(imagePath)) {
    console.error(`${photo.id}: 缺少照片 ${photo.image_path}`);
    failed = true;
    continue;
  }
  if (!existsSync(resultPath)) {
    console.error(`${photo.id}: 缺少结果 ${photo.result_path}`);
    failed = true;
    continue;
  }
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  const validation = validateAnalysisResult(result);
  if (result.photo_id !== photo.id) {
    validation.errors.push(`photo_id ${result.photo_id} 与数据集 ID 不一致`);
  }
  if (validation.errors.length) {
    failed = true;
    console.error(`${photo.id}:`);
    validation.errors.forEach((error) => console.error(`  - ${error}`));
  } else {
    console.log(`${photo.id}: PASS`);
  }
}

console.log(`已校验 ${readyCount}/${dataset.photos.length} 张就绪照片。`);
if (failed) process.exitCode = 1;
