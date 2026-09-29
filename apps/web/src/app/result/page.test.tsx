import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultPage from './page';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem('darkroom:last-analysis', JSON.stringify({
    result: {
      evaluation_id: 'e1', photo_id: 'p1', schema_version: '1.1.0',
      model: { provider: 'qwen', name: 'qwen', version: '1', prompt_version: '1' },
      overall_score: 80, score_summary: '空间关系清楚。',
      dimension_scores: [
        { dimension: 'composition', score: 85, evidence: '构图证据', suggestion: '保留边缘', confidence: 0.8 },
        { dimension: 'light', score: 75, evidence: '光线证据', suggestion: '保持光线', confidence: 0.8 },
        { dimension: 'color_tone', score: 51, evidence: '色彩证据', suggestion: '保持色彩', confidence: 0.8 },
        { dimension: 'narrative', score: 50, evidence: '叙事证据', suggestion: '保持叙事', confidence: 0.8 },
        { dimension: 'technical', score: 0, evidence: '技术证据', suggestion: '检查细节', confidence: 0.8 },
      ],
      professional_scores: [
        { dimension: 'intent_fit', score: 0, evidence: '意图证据不足', suggestion: '补充意图', confidence: 0 },
        { dimension: 'visual_structure', score: 85, evidence: '视觉结构证据', suggestion: '保留边缘关系', confidence: 0.8 },
        { dimension: 'content_narrative', score: 80, evidence: '内容关系证据', suggestion: '等待人物关系', confidence: 0.8 },
        { dimension: 'light_color', score: 75, evidence: '光色证据', suggestion: '保持影调', confidence: 0.8 },
        { dimension: 'timing_relationship', score: 72, evidence: '时机证据', suggestion: '比较相邻瞬间', confidence: 0.8 },
        { dimension: 'craft', score: 51, evidence: '制作证据', suggestion: '检查高光', confidence: 0.8 },
        { dimension: 'voice_originality', score: 68, evidence: '作者选择证据', suggestion: '延续该方法', confidence: 0.8 },
      ],
      evaluation_context: {
        profile: 'street_documentary', profile_label: '街头 / 纪实', strategy: 'layered_ambiguous',
        strategy_confidence: 0.82, intent_status: 'unclear', severe_issue: false, floor_applied: false, raw_score: 76,
      },
      subject_boxes: [{ id: 's', label: '主体', decision: 'omit', rationale: '不明确', confidence: 0.4, omit_reason: '不明确', box: null }],
      leading_lines: [{ id: 'l', label: '引导线', decision: 'omit', rationale: '不明确', confidence: 0.4, omit_reason: '不明确', points: null }],
      crop_boxes: [{ id: 'c', label: '裁切', decision: 'omit', rationale: '保留原构图', confidence: 0.4, omit_reason: '保守', box: null, loss_ratio: 0, preserves_intent: '保留' }],
      observations: ['观察事实'], interpretations: ['摄影解释'],
      subjective_judgments: [{ judgment: '判断', alternative_reading: '替代解读' }],
      suggestions: [{ type: 'next_shoot', action: '下次观察', why: '因为', verification: '对比', confidence: 0.8 }],
      intent_alignment: null, confidence: { overall: 0.8, subject_boxes: 0.4, leading_lines: 0.4, crop_boxes: 0.4 }, safety_flags: [],
    }, imageDataUrl: 'data:image/jpeg;base64,abc', displayImageUrl: 'blob:original-photo', imageName: 'p1.jpg', intent: '尝试模仿森山大道的高反差街头感',
  }));
});

it('shows five clear dimensions without repeating the facts panel', async () => {
  render(<ResultPage />);
  expect(await screen.findByText('综合参考')).toBeVisible();
  expect(screen.queryByText('现在该做什么')).not.toBeInTheDocument();
  expect(screen.getByText('来源线索：暂未找到可靠的作者或具体作品匹配。')).toBeVisible();
  expect(screen.queryByText('作者识别')).not.toBeInTheDocument();
  expect(screen.getAllByRole('progressbar')).toHaveLength(5);
  expect(screen.getByRole('checkbox', { name: '主体框' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: '引导线' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: '裁切框' })).not.toBeChecked();
  expect(screen.getByText('结构化分析 · 工作台规则已通过校验。')).toBeVisible();
  expect(screen.getByRole('progressbar', { name: '构图 85 分' }).closest('article')).toHaveClass('workbench-dimension--high');
  expect(screen.getByRole('progressbar', { name: '光线 75 分' }).closest('article')).toHaveClass('workbench-dimension--mid');
  expect(screen.getByRole('progressbar', { name: '技术质量 0 分' }).closest('article')).toHaveClass('workbench-dimension--low');
  expect(screen.queryByText('意图与语境完成度')).not.toBeInTheDocument();
  expect(screen.getByText(/评价语境：街头 \/ 纪实 · 画面策略：复合关系与开放歧义/)).toBeVisible();
  expect(screen.getByAltText('p1.jpg 的完整分析图')).toHaveAttribute('src', 'blob:original-photo');
  expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: '再看一张照片' })).toHaveClass('workbench-fill-action');
  expect(screen.getByRole('link', { name: '历史记录' })).toBeVisible();
  expect(screen.queryByText('本次分析')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '重新选择照片' })).not.toBeInTheDocument();
  expect(screen.queryByText('观察事实')).not.toBeInTheDocument();
  expect(screen.queryByText(/不画「/)).not.toBeInTheDocument();
  expect(screen.getByText('本次创作意图')).toBeVisible();
  expect(screen.getByText('尝试模仿森山大道的高反差街头感')).toBeVisible();
  expect(screen.queryByText('保留边缘')).not.toBeInTheDocument();
  expect(screen.queryByText(/总分由五个分项/)).not.toBeInTheDocument();
  expect(screen.getByText('基于摄影知识的解释')).toBeVisible();
});

it('saves a reusable human evaluation without storing the photo', async () => {
  const user = userEvent.setup();
  render(<ResultPage />);
  expect(await screen.findByRole('heading', { name: '这次点评是否真的可靠？' })).toBeVisible();

  await user.selectOptions(screen.getByLabelText('主体框准确'), '2');
  await user.type(screen.getByLabelText('严重错误与备注'), '主体框准确。');
  await user.click(screen.getByRole('button', { name: '保存本次反馈' }));

  expect(screen.getByText('反馈已保存在当前浏览器。')).toBeVisible();
  const saved = localStorage.getItem('darkroom:human-feedback:v1') ?? '';
  expect(saved).toContain('主体框准确。');
  expect(saved).not.toContain('data:image');
  expect(saved).not.toContain('blob:original-photo');
});
