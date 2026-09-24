# AI 摄影分析能力验证实验台

这是独立于正式产品的零依赖本地实验，用固定公共领域样例验证：

- 主体框是否准确；
- 引导线是否克制；
- 裁切是否保守；
- 七个专业维度、类型权重和中文点评是否具体；
- 低置信度坐标是否正确“不画”。

它不接正式上传、账户、支付、数据库或模型 SDK。三份内置结果是人工编写的
`mock JSON`，用途是校准 schema、回绘和人工评估流程，不代表任何模型已经通过。

## 运行

需要 Node.js 20 或更新版本，无需安装依赖。

```bash
node experiments/ai-analysis-eval/scripts/validate-fixtures.mjs
node --test experiments/ai-analysis-eval/test/validator.test.mjs
node experiments/ai-analysis-eval/scripts/serve.mjs
```

浏览器打开 <http://127.0.0.1:4173>。

在页面中可以：

1. 切换三张公共领域固定样例；
2. 独立开关主体框、引导线和裁切框；
3. 查看“不画”原因与校验结果；
4. 导入当前照片对应的模型 JSON；
5. 按六项标准做 0/1/2 人工评分；
6. 把浏览器内保存的结果导出为 CSV。

## 接入真实 Qwen API

复制 `.env.example` 为 `.env`，只填写你自己的百炼普通 API Key；不要把 `.env` 提交到 Git，
也不要把 Key 发到聊天里。脚本默认使用 `qwen3.7-plus-2026-05-26` 和百炼兼容接口，
不需要你手工填写业务空间 ID；如果创建 API Key 的弹窗给出了专属 API Host，
再把它填入 `DASHSCOPE_BASE_URL`。

```bash
cp experiments/ai-analysis-eval/.env.example experiments/ai-analysis-eval/.env
# 用文本编辑器打开 .env，替换 DASHSCOPE_API_KEY 的占位内容
node --env-file=experiments/ai-analysis-eval/.env \
  experiments/ai-analysis-eval/scripts/run-qwen.mjs \
  --photo landscape-s-curve
```

成功后会生成一个带 `-qwen` 后缀的结果 JSON。打开实验页，点击“导入当前照片 JSON”，
选择这个文件即可查看真实模型的点评和坐标。脚本会在保存前运行本地 schema、边界、
旧结果仍使用五个兼容分项；新结果应返回 `professional_scores` 和 `evaluation_context`，由服务端按照片类型做加权计算。模型原始总分保存在
`model_overall_score`，便于发现模型自报分数与服务端校准结果的偏差。
低置信度和裁切损失校验；不合格结果不会保存。

## 目录

```text
public/dataset.json                    12 个固定评测槽位
public/photos/                         3 张公共领域样例
public/results/                        固定 mock JSON
schema/analysis-result.schema.json     模型输出契约
src/validator.mjs                      阈值与坐标语义校验
prompts/analysis-v1.md                 供应商无关提示词骨架
model-adapter.example.mjs              待实现模型接口
evaluation/                            人工评估表
```

## 接真实模型前

1. 补齐 12 张且逐张记录权利状态；不得使用真实用户照片。
2. 在独立适配器中实现 `analyze(photo_path, context, schema)`。
3. 对同一照片集保存模型、模型版本、提示版本、延迟和成本。
4. 先运行 fixture 校验，再把 JSON 导入页面人工判断。
5. 至少两人盲评，使用实验规格中的门槛决定“上线坐标”还是降级为纯文字。

完整数据集规则、人工量表和通过门槛见
`docs/experiments/2026-07-27-ai-analysis-capability-evaluation.md`。
