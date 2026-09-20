import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnalysisRequest, normalizeAnalysisResult } from '../../features/analysis/contract';

const DEFAULT_MODEL = 'qwen3.7-plus-2026-05-26';
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const REQUEST_TIMEOUT_MS = 150_000;

function readWorkbenchSchema(): string {
  const relativePath = 'experiments/ai-analysis-eval/schema/analysis-result.schema.json';
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', '..', relativePath),
  ];
  const schemaPath = candidates.find((candidate) => existsSync(candidate));
  if (!schemaPath) throw new Error('找不到工作台 analysis-result schema');
  return readFileSync(schemaPath, 'utf8');
}

export function buildPrompt(request: AnalysisRequest): string {
  const { genre, intent, focus } = request.context;
  return `
请分析照片 ${request.image.name}，摄影语境是“${genre || '不确定'}”。
这是摄影分析，不是生成或修改照片。只返回 JSON，不要 Markdown 代码围栏。

必须严格区分 observations（可直接观察事实）、interpretations（摄影知识解释）、
subjective_judgments（主观判断和 alternative_reading）和 suggestions（可执行建议）。
坐标要使用 0 到 1 的归一化数值；位置置信度低于 0.55 时必须 decision=omit，几何字段为 null。
没有可靠主体、引导线或裁切时，明确返回 omit，不要为了满足格式乱画。
引导线必须把视线从前景、边缘或次要区域带向主体或视觉焦点；普通裂缝、接缝、纹理、
地平线或仅仅存在的斜线，如果没有明确观看方向，不算可靠引导线，必须返回 omit。
裁切默认返回 omit。只有主体明确、创作意图不会被破坏、置信度至少 0.75，且实际裁掉
不超过画面面积 25% 时才可 draw；街拍、复合构图或主体不明确时优先保留原构图。
主体框必须完整包住主体的可见范围，可留少量边距，不能只框住头部或主体的一部分；
如果主体太小、被遮挡或坐标不确定，返回 omit。
box 必须严格使用 {"x":数值,"y":数值,"width":数值,"height":数值} 对象，绝不能使用数组、right/bottom 或 x2/y2。
score_summary 只描述这张照片的具体观察和解读，不得出现“总分”“快速索引”“五个分项平均”等固定话术。
没有 EXIF 或用户明确说明时，不得断言使用了直闪、跳闪、特定焦距、光圈、快门、ISO、镜头或其他拍摄设备与参数。
只能先描述画面可见现象，例如“人物面部与鼻梁出现集中高光、背景相对较暗”。需要解释成因时，使用
“画面呈现类似较硬正面光源的视觉效果”“可能来自较近或较硬的光源”“无法仅凭画面确认具体光源”等克制表达，
并保留环境灯、其他人造光或后期处理等合理可能。不要把视觉效果直接写成已经确认的拍摄事实。
可以使用摄影专业术语，但先用普通中文说明，必要时再把术语放在括号中。可以提出光圈、焦距、快门、ISO、闪光或用光方向的条件式建议，
但必须说明建议想改变什么视觉效果，不得反向断言用户当前采用了某个参数或手法。例如：
“若希望增加景深，可尝试缩小光圈（提高 f 值）”；“若现场确实使用闪光，可尝试降低输出或改变入射方向”。
每个建议必须回答改什么、为什么、如何验证；不要新增、移除或替换真实物体。
overall_score 和五个 dimension_scores.score 必须使用 0 到 100 的整数百分制，不得使用 0 到 10 分制。
控制输出长度：observations 3～5 条，interpretations 2～4 条，subjective_judgments 1～2 条，suggestions 2～3 条；每条尽量用一到两句话。
当 suggestions.type="postprocess" 且画面证据确实支持调整时，action 必须给出 1 到 3 个保守的参数起点，并说明它们是相对当前画面的试调范围，而不是绝对正确值。
例如：色温向暖 +200～400K、色调 +2～+5、对比度 +4～+8、高光 -8～-15、阴影 +5～+12、自然饱和度 +3～+8。只选择与该照片问题直接相关的参数，不要每张照片机械套用，也不要虚构相机 RAW 的原始数值。

用户创作意图：${intent || '未填写'}
希望重点关注：${focus.length > 0 ? focus.join('、') : '未指定'}
创作意图只能帮助 interpretations、subjective_judgments 和 suggestions 解释画面，不能改变 observations，不能直接加分，也不能为了迎合用户抬高评价。未填写时不得虚构意图。

JSON Schema：
${readWorkbenchSchema()}
`;
}

async function requestOnce(request: AnalysisRequest, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${process.env.DASHSCOPE_BASE_URL ?? DEFAULT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.PHOTO_MENTOR_MODEL ?? DEFAULT_MODEL,
        enable_thinking: process.env.PHOTO_MENTOR_ENABLE_THINKING === 'true',
        temperature: 0.2,
        max_tokens: 3200,
        messages: [
          {
            role: 'system',
            content: '你是严谨、克制的中文摄影分析助手。区分事实、解释和审美判断。',
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: request.image.dataUrl } },
              { type: 'text', text: buildPrompt(request) },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeWithQwen(request: AnalysisRequest) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('本地服务缺少 DASHSCOPE_API_KEY');

  let response: Response;
  try {
    response = await requestOnce(request, apiKey);
  } catch (error) {
    if (error instanceof TypeError) response = await requestOnce(request, apiKey);
    else if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('本次分析等待超过 150 秒，请稍后重试');
    } else throw error;
  }

  const payload = await response.json();
  if (!response.ok) throw new Error(`模型服务暂时不可用（${response.status}）`);
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('模型没有返回可读取的分析结果');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('模型返回格式不完整，请重新分析');
  }
  try {
    return normalizeAnalysisResult(parsed);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`模型返回格式未通过校验：${error.message.slice(0, 500)}`);
    }
    throw new Error('模型返回格式未通过校验，请重试');
  }
}
