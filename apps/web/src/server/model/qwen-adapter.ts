import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnalysisRequest, normalizeAnalysisResult } from '../../features/analysis/contract';

const DEFAULT_MODEL = 'qwen3.7-plus-2026-05-26';
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const REQUEST_TIMEOUT_MS = 150_000;
const PROMPT_VERSION = 'professional-v1';

export type ModelProvider = 'dashscope' | 'deepseek';

export type ModelConfig = {
  provider: ModelProvider;
  apiKey?: string;
  baseUrl: string;
  model: string;
};

/**
 * Keep provider selection outside the business flow. The same OpenAI-compatible
 * message shape is used for both providers, while each provider keeps its own
 * key and default endpoint/model.
 */
export function getModelConfig(env: NodeJS.ProcessEnv = process.env): ModelConfig {
  const providerValue = env.PHOTO_MENTOR_PROVIDER?.trim().toLowerCase() || 'dashscope';
  if (providerValue !== 'dashscope' && providerValue !== 'deepseek') {
    throw new Error(`不支持的模型供应商：${providerValue}`);
  }
  const provider = providerValue as ModelProvider;
  const isDeepSeek = provider === 'deepseek';
  const baseUrl = (
    env.PHOTO_MENTOR_BASE_URL
    ?? (isDeepSeek ? env.DEEPSEEK_BASE_URL : env.DASHSCOPE_BASE_URL)
    ?? (isDeepSeek ? 'https://api.deepseek.com' : DEFAULT_BASE_URL)
  ).replace(/\/+$/, '');

  return {
    provider,
    apiKey: env.PHOTO_MENTOR_API_KEY ?? (isDeepSeek ? env.DEEPSEEK_API_KEY : env.DASHSCOPE_API_KEY),
    baseUrl,
    model: env.PHOTO_MENTOR_MODEL ?? (isDeepSeek ? 'deepseek-flash' : DEFAULT_MODEL),
  };
}

function readWorkbenchSchema(): string {
  const relativePath = 'experiments/ai-analysis-eval/schema/analysis-result.schema.json';
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', '..', relativePath),
  ];
  const schemaPath = candidates.find((candidate) => existsSync(candidate));
  if (!schemaPath) throw new Error('找不到工作台 analysis-result schema');
  return JSON.stringify(JSON.parse(readFileSync(schemaPath, 'utf8')));
}

export function buildPrompt(request: AnalysisRequest): string {
  const { genre, intent, focus } = request.context;
  const intentInstruction = intent
    ? 'subjective_judgments 返回 2～3 条，至少一条必须明确回应用户创作意图：指出哪些画面证据支持或削弱该意图，并提供另一种合理解读。'
    : 'subjective_judgments 返回 2 条；用户未填写创作意图，不得虚构、猜测或代写意图。';
  return `
请分析这张照片，摄影语境是“${genre || '不确定'}”。照片文件名、EXIF 和上传来源不属于分析依据，不要尝试从中推断作者、作品或拍摄背景。
这是摄影分析，不是生成或修改照片。只返回 JSON，不要 Markdown 代码围栏。
model.prompt_version 必须为 "${PROMPT_VERSION}"。
所有用户可见文本必须使用简体中文，包括 label、rationale、omit_reason、evidence、suggestion、观察、解释和建议。
艺术家姓名、作品名或画面中真实出现的外文可以保留，但必须在同一句提供中文解释；不要输出整句英文。

必须严格区分 observations（可直接观察事实）、interpretations（摄影知识解释）、
subjective_judgments（主观判断和 alternative_reading）和 suggestions（可执行建议）。
坐标要使用 0 到 1 的归一化数值；位置置信度低于 0.55 时必须 decision=omit，几何字段为 null。
没有可靠主体、引导线或裁切时，明确返回 omit，不要为了满足格式乱画。
引导线不只指“消失点线”，也可以是结构性引导或框景线：道路、轨道、栏杆、金属管线、弧线、
光带或重复边缘，只要它们从近景进入中景、形成连续观看路径、包围主体或组织多个视觉层次，
就可以 draw。普通裂缝、接缝、纹理、地平线或仅仅存在的斜线，如果没有方向、连续性或构图作用，才返回 omit。
裁切默认返回 omit。只有主体明确、创作意图不会被破坏、置信度至少 0.75，且实际裁掉
不超过画面面积 25% 时才可 draw；loss_ratio 必须是被裁掉的画面面积比例小数，0.25 表示 25%，绝不能填写 25 或超过 0.25；街拍、复合构图或主体不明确时优先保留原构图。
主体框必须完整包住主体的可见范围，可留少量边距，不能只框住头部或主体的一部分；
如果主体太小、被遮挡或坐标不确定，返回 omit。对于 layered_ambiguous 或 decisive_moment，
如果画面由多个同等重要的人物、物体和前景遮挡共同成立，不要给每个局部人物分别画框；返回一个
omit，说明“复合构图没有单一可靠主体框”，把完整关系交给文字分析。
box 必须严格使用 {"x":数值,"y":数值,"width":数值,"height":数值} 对象，绝不能使用数组、right/bottom 或 x2/y2。
先在 evaluation_context.strategy 中识别这张照片主要采用的画面策略，只能使用 single_subject、layered_ambiguous、minimal_space、geometric、environmental_portrait、decisive_moment、color_light、conceptual 或 unclear；策略识别不是优劣判断。
evaluation_context.strategy_confidence 必须是 0 到 1；无法确定时使用 unclear。severe_issue 只有在有充分画面证据表明主要表达被严重破坏时才为 true。
evaluation_context.intent_status 只能使用 supported、partial、unclear 或 not_provided；未填写意图时使用 not_provided。
score_summary 只描述这张照片的具体观察和解读，不得出现“总分”“快速索引”“五个分项平均”等固定话术。
没有 EXIF 或用户明确说明时，不得断言使用了直闪、跳闪、特定焦距、光圈、快门、ISO、镜头或其他拍摄设备与参数。
只能先描述画面可见现象，例如“人物面部与鼻梁出现集中高光、背景相对较暗”。需要解释成因时，使用
“画面呈现类似较硬正面光源的视觉效果”“可能来自较近或较硬的光源”“无法仅凭画面确认具体光源”等克制表达，
并保留环境灯、其他人造光或后期处理等合理可能。不要把视觉效果直接写成已经确认的拍摄事实。
可以使用摄影专业术语，但先用普通中文说明，必要时再把术语放在括号中。可以提出光圈、焦距、快门、ISO、闪光或用光方向的条件式建议，
但必须说明建议想改变什么视觉效果，不得反向断言用户当前采用了某个参数或手法。例如：
“若希望增加景深，可尝试缩小光圈（提高 f 值）”；“若现场确实使用闪光，可尝试降低输出或改变入射方向”。
每个建议必须回答改什么、为什么、如何验证；不要新增、移除或替换真实物体。
professional_scores 必须严格包含以下 7 个维度，各出现一次：intent_fit、visual_structure、content_narrative、light_color、timing_relationship、craft、voice_originality。每项使用 0 到 100 的整数百分制，并提供具体证据、短建议和置信度。
评分锚点：0=没有证据或不适用，1（约 25）=主要表达被明显削弱，2（约 50）=部分成立，3（约 75）=明确成立，4（约 90）=在当前语境下高度完成。可以使用 0 到 100 细化，但不能因为复杂、遮挡、边缘截断、暗部较深或主体不居中就自动扣分；只有这些现象与画面策略或意图冲突，并且有具体证据时才扣分。
未填写创作意图时，intent_fit.score 必须为 0、confidence 必须为 0，并在 evidence 中写明“未提供创作意图，暂不评估”；不允许用 0 分表示照片失败。
如果某个维度不适用于该类型，score 使用 0、confidence 使用 0，并说明“不适用于当前语境”；校准器会从总体计算中排除该维度。
dimension_scores 为兼容字段，按 composition、light、color_tone、narrative、technical 返回 5 项；它们只用于旧记录兼容，不能替代 professional_scores。
overall_score 使用专业评价校准后的结果，不要自行计算；服务端会按用户类型和有效维度权重计算。
控制阅读密度：每个 professional_scores.evidence 只写一句具体证据，尽量不超过 45 个汉字；每项 suggestion 只写一个短句，不重复完整建议。
observations 返回 3～4 条，interpretations 返回 2～3 条，suggestions 返回 2～3 条；把解释篇幅优先用于 subjective_judgments，不要在评分里重复下方建议。
${intentInstruction}
当 suggestions.type="postprocess" 且画面证据确实支持调整时，action 必须给出 1 到 3 个保守的参数起点，并说明它们是相对当前画面的试调范围，而不是绝对正确值。
例如：色温向暖 +200～400K、色调 +2～+5、对比度 +4～+8、高光 -8～-15、阴影 +5～+12、自然饱和度 +3～+8。只选择与该照片问题直接相关的参数，不要每张照片机械套用，也不要虚构相机 RAW 的原始数值。

用户创作意图：${intent || '未填写'}
希望重点关注：${focus.length > 0 ? focus.join('、') : '未指定'}
创作意图只能帮助 interpretations、subjective_judgments 和 suggestions 解释画面，不能改变 observations，不能直接加分，也不能为了迎合用户抬高评价。未填写时不得虚构意图。

JSON Schema：
${readWorkbenchSchema()}
`;
}

function findJsonObject(value: string): string | null {
  const start = value.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }
  return null;
}

export function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  const candidates = [
    trimmed.replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim(),
  ];
  const extracted = findJsonObject(trimmed);
  if (extracted && !candidates.includes(extracted)) candidates.push(extracted);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next deterministic representation before asking the model again.
    }
  }
  throw new Error('模型返回格式不完整，请重新分析');
}

async function requestOnce(request: AnalysisRequest, config: ModelConfig, correction = ''): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const enableThinking = process.env.PHOTO_MENTOR_ENABLE_THINKING === 'true';
    const body: Record<string, unknown> = {
      model: config.model,
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
            { type: 'text', text: `${buildPrompt(request)}${correction}` },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    };

    if (config.provider === 'deepseek') {
      // DeepSeek Flash enables thinking by default. Disable it for the normal
      // fast path; callers can opt in for a deliberate quality/latency tradeoff.
      body.thinking = { type: enableThinking ? 'enabled' : 'disabled' };
    } else {
      body.enable_thinking = enableThinking;
      body.temperature = 0.2;
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`模型服务暂时不可用（${response.status}）`);
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('模型没有返回可读取的分析结果');
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestWithNetworkRetry(request: AnalysisRequest, config: ModelConfig, correction: string) {
  try {
    return await requestOnce(request, config, correction);
  } catch (error) {
    if (error instanceof TypeError) return requestOnce(request, config, correction);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('本次分析等待超过 150 秒，请稍后重试');
    }
    throw error;
  }
}

function normalizeModelResponse(content: string, config: ModelConfig, request: AnalysisRequest) {
  const parsed = parseModelJson(content);
  try {
    const result = normalizeAnalysisResult(parsed, {
      genre: request.context.genre,
      intentProvided: Boolean(request.context.intent.trim()),
    });
    return {
      ...result,
      model: {
        ...result.model,
        provider: config.provider,
        name: config.model,
        prompt_version: PROMPT_VERSION,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`模型返回格式未通过校验：${error.message.slice(0, 500)}`);
    }
    throw new Error('模型返回格式未通过校验，请重试');
  }
}

export async function analyzeWithQwen(request: AnalysisRequest) {
  const config = getModelConfig();
  if (!config.apiKey) {
    const keyNames = config.provider === 'deepseek'
      ? 'DEEPSEEK_API_KEY 或 PHOTO_MENTOR_API_KEY'
      : 'DASHSCOPE_API_KEY 或 PHOTO_MENTOR_API_KEY';
    throw new Error(`本地服务缺少 ${keyNames}`);
  }
  const startedAt = Date.now();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const correction = attempt === 0
      ? ''
      : '\n上一轮输出未能通过本地 JSON/schema 校验。请重新生成一个完整的 JSON 对象，只返回 JSON，不要 Markdown、解释文字或省略字段；不确定的主体、引导线和裁切请使用 decision=omit。';
    const content = await requestWithNetworkRetry(request, config, correction);
    try {
      const normalized = normalizeModelResponse(content, config, request);
      console.info('[analysis-timing]', JSON.stringify({
        model: normalized.model.name,
        input_bytes: Math.round(request.image.dataUrl.length * 0.75),
        output_chars: content.length,
        attempts: attempt + 1,
        elapsed_ms: Date.now() - startedAt,
      }));
      return normalized;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('模型返回格式未通过校验，请重试');
      if (attempt === 0) continue;
    }
  }

  throw lastError ?? new Error('模型返回格式未通过校验，请重试');
}
