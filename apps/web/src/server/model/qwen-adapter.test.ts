import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeWithQwen, buildPrompt, getModelConfig, parseModelJson } from './qwen-adapter';

const request = {
  image: { dataUrl: 'data:image/jpeg;base64,abc', width: 1200, height: 800, name: 'street.jpg' },
  context: { genre: '街头', intent: '想保留人物与环境之间的距离', focus: ['构图'] },
};

function validModelResult() {
  return {
    schema_version: '1.0.0',
    evaluation_id: 'evaluation-1',
    photo_id: 'photo-1',
    model: { provider: 'qwen', name: 'qwen', version: '1', prompt_version: '1' },
    overall_score: 70,
    score_summary: '画面关系清楚。',
    dimension_scores: ['composition', 'light', 'color_tone', 'narrative', 'technical'].map((dimension) => ({
      dimension, score: 70, evidence: '可见证据', suggestion: '保持克制', confidence: 0.8,
    })),
    subject_boxes: [{ id: 'subject-1', label: '主体', decision: 'omit', rationale: '主体不明确', confidence: 0.4, omit_reason: '主体不明确', box: null }],
    leading_lines: [{ id: 'line-1', label: '引导线', decision: 'omit', rationale: '没有可靠方向', confidence: 0.4, omit_reason: '没有可靠方向', points: null }],
    crop_boxes: [{ id: 'crop-1', label: '保留原图', decision: 'omit', rationale: '复合构图不宜收紧', confidence: 0.4, omit_reason: '复合构图不宜收紧', box: null, loss_ratio: 0, preserves_intent: '保留主体关系' }],
    observations: ['可见事实'],
    interpretations: ['摄影解释'],
    subjective_judgments: [{ judgment: '主观判断', alternative_reading: '另一种理解' }],
    suggestions: [{ type: 'crop_review', action: '比较原图', why: '避免过度裁切', verification: '切换预览', confidence: 0.8 }],
    confidence: { overall: 0.8, subject_boxes: 0.4, leading_lines: 0.4, crop_boxes: 0.8 },
    safety_flags: [],
  };
}

function professionalModelResult(score = 58) {
  const { dimension_scores: _legacyScores, ...base } = validModelResult();
  return {
    ...base,
    overall_score: score,
    professional_scores: [
      'intent_fit',
      'visual_structure',
      'content_narrative',
      'light_color',
      'timing_relationship',
      'craft',
      'voice_originality',
    ].map((dimension) => ({
      dimension,
      score,
      evidence: '可见证据',
      suggestion: '保持克制',
      confidence: 0.8,
    })),
    evaluation_context: {
      profile: 'general',
      profile_label: '通用摄影阅读',
      strategy: 'layered_ambiguous',
      strategy_confidence: 0.82,
      intent_status: 'supported',
      severe_issue: false,
      floor_applied: false,
      raw_score: score,
    },
  };
}

function responseFor(result: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }), { status: 200 });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Qwen workbench prompt', () => {
  it('embeds the compact workbench schema and keeps intent from changing facts or scores', () => {
    const schema = readFileSync(
      resolve(process.cwd(), '..', '..', 'experiments/ai-analysis-eval/schema/analysis-result.schema.json'),
      'utf8',
    );
    const prompt = buildPrompt(request);

    expect(prompt).toContain(JSON.stringify(JSON.parse(schema)));
    expect(prompt).not.toContain('\n  "$schema"');
    expect(prompt).toContain('box 必须严格使用 {"x":数值,"y":数值,"width":数值,"height":数值} 对象');
    expect(prompt).toContain('不能改变 observations，不能直接加分');
    expect(prompt).toContain('给出 1 到 3 个保守的参数起点');
    expect(prompt).toContain('色温向暖 +200～400K');
    expect(prompt).toContain('不得断言使用了直闪、跳闪、特定焦距、光圈、快门、ISO、镜头或其他拍摄设备与参数');
    expect(prompt).toContain('画面呈现类似较硬正面光源的视觉效果');
    expect(prompt).toContain('无法仅凭画面确认具体光源');
    expect(prompt).toContain('可以提出光圈、焦距、快门、ISO、闪光或用光方向的条件式建议');
    expect(prompt).toContain('若希望增加景深，可尝试缩小光圈（提高 f 值）');
    expect(prompt).toContain('所有用户可见文本必须使用简体中文');
    expect(prompt).toContain('model.prompt_version 必须为 "professional-v1"');
    expect(prompt).toContain('subjective_judgments 返回 2～3 条');
    expect(prompt).toContain('至少一条必须明确回应用户创作意图');
    expect(prompt).toContain('照片文件名、EXIF 和上传来源不属于分析依据');
    expect(prompt).toContain('金属管线、弧线、');
    expect(prompt).toContain('复合构图没有单一可靠主体框');
    expect(prompt).not.toContain('street.jpg');
  });

  it('extracts a JSON object wrapped in Markdown or explanatory text', () => {
    expect(parseModelJson('分析如下：\n```json\n{"ok":true}\n```\n')).toEqual({ ok: true });
  });

  it('does not pretend that truncated JSON is valid', () => {
    expect(() => parseModelJson('{"ok":')).toThrow('模型返回格式不完整');
  });

  it('selects DeepSeek Flash from environment variables without exposing the key in code', () => {
    vi.stubEnv('PHOTO_MENTOR_PROVIDER', 'deepseek');
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key');

    expect(getModelConfig()).toEqual({
      provider: 'deepseek',
      apiKey: 'test-deepseek-key',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
    });
  });

  it('runs a focused source pass beside the full critique', async () => {
    vi.stubEnv('DASHSCOPE_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(responseFor(validModelResult())));

    await analyzeWithQwen(request);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a confident visual source match in the normalized result', async () => {
    vi.stubEnv('DASHSCOPE_API_KEY', 'test-key');
    const sourcePass = {
      status: 'identified',
      primary_name: 'Alex Webb',
      candidates: [{ name: 'Alex Webb', work: 'Untitled', confidence: 0.91, evidence: '多层人物关系与强烈色彩并置形成多项一致线索。' }],
      confidence: 0.91,
      evidence: '多层人物关系与强烈色彩并置形成多项一致线索。',
      source: 'visual_match',
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      const prompt = body.messages?.[1]?.content?.[1]?.text ?? '';
      return responseFor(prompt.includes('作品来源识别') ? sourcePass : validModelResult());
    });

    const result = await analyzeWithQwen(request);

    expect(result.author_attribution).toEqual(expect.objectContaining({ status: 'identified', primary_name: 'Alex Webb' }));
  });

  it('derives compatibility scores and applies the street profile to professional output', async () => {
    vi.stubEnv('DASHSCOPE_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(responseFor(professionalModelResult())));

    const result = await analyzeWithQwen(request);

    expect(result.overall_score_method).toBe('weighted_context_v1');
    expect(result.overall_score).toBe(72);
    expect(result.evaluation_context).toEqual(expect.objectContaining({
      profile: 'street_documentary',
      floor_applied: true,
      raw_score: 58,
    }));
    expect(result.dimension_scores).toHaveLength(5);
  });

  it('uses the DeepSeek vision endpoint and disables thinking for the fast path', async () => {
    vi.stubEnv('PHOTO_MENTOR_PROVIDER', 'deepseek');
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key');
    vi.stubEnv('PHOTO_MENTOR_ENABLE_THINKING', 'false');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(responseFor(validModelResult())));

    await analyzeWithQwen(request);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('deepseek-flash');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.temperature).toBeUndefined();
  });

  it('retries only after malformed model JSON and accepts the repaired response', async () => {
    vi.stubEnv('DASHSCOPE_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(responseFor(validModelResult()))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"schema_version":"1.0.0"' } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(responseFor(validModelResult()));

    const result = await analyzeWithQwen(request);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.model.prompt_version).toBe('professional-v1');
  });
});
