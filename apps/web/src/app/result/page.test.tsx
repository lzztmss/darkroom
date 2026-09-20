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
        { dimension: 'composition', score: 75, evidence: '构图证据', suggestion: '保留边缘', confidence: 0.8 },
        { dimension: 'light', score: 74, evidence: '光线证据', suggestion: '保持光线', confidence: 0.8 },
        { dimension: 'color_tone', score: 51, evidence: '色彩证据', suggestion: '保持色彩', confidence: 0.8 },
        { dimension: 'narrative', score: 50, evidence: '叙事证据', suggestion: '保持叙事', confidence: 0.8 },
        { dimension: 'technical', score: 0, evidence: '技术证据', suggestion: '检查细节', confidence: 0.8 },
      ],
      subject_boxes: [{ id: 's', label: '主体', decision: 'omit', rationale: '不明确', confidence: 0.4, omit_reason: '不明确', box: null }],
      leading_lines: [{ id: 'l', label: '引导线', decision: 'omit', rationale: '不明确', confidence: 0.4, omit_reason: '不明确', points: null }],
      crop_boxes: [{ id: 'c', label: '裁切', decision: 'omit', rationale: '保留原构图', confidence: 0.4, omit_reason: '保守', box: null, loss_ratio: 0, preserves_intent: '保留' }],
      observations: ['观察事实'], interpretations: ['摄影解释'],
      subjective_judgments: [{ judgment: '判断', alternative_reading: '替代解读' }],
      suggestions: [{ type: 'next_shoot', action: '下次观察', why: '因为', verification: '对比', confidence: 0.8 }],
      intent_alignment: null, confidence: { overall: 0.8, subject_boxes: 0.4, leading_lines: 0.4, crop_boxes: 0.4 }, safety_flags: [],
    }, imageDataUrl: 'data:image/jpeg;base64,abc', displayImageUrl: 'blob:original-photo', imageName: 'p1.jpg', intent: '',
  }));
});

it('shows the five scores as accessible colored bars instead of numbers only', async () => {
  render(<ResultPage />);
  expect(await screen.findByText('快速索引')).toBeVisible();
  expect(screen.getAllByRole('progressbar')).toHaveLength(5);
  expect(screen.getByRole('checkbox', { name: '主体框' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: '引导线' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: '裁切框' })).toBeChecked();
  expect(screen.getByText(/工作台 schema 1\.0\.0/)).toBeVisible();
  expect(screen.getByText('构图')).toBeVisible();
  for (const label of ['构图 75 分', '光线 74 分', '色彩与影调 51 分', '叙事 50 分', '技术质量 0 分']) {
    expect(screen.getByRole('progressbar', { name: label }).closest('article')).toHaveClass('workbench-dimension--accent');
  }
  expect(screen.getByAltText('p1.jpg 的完整分析图')).toHaveAttribute('src', 'blob:original-photo');
  expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: '再看一张照片' })).toHaveClass('workbench-fill-action');
  expect(screen.getByRole('link', { name: '历史记录' })).toBeVisible();
  expect(screen.queryByText('本次分析')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '重新选择照片' })).not.toBeInTheDocument();
  expect(screen.getByText('观察事实')).toBeVisible();
  expect(screen.queryByText(/总分由五个分项/)).not.toBeInTheDocument();
  expect(screen.getByText('可直接观察的事实').closest('.workbench-review-layout')).toBe(
    screen.getByLabelText('照片分析结果').closest('.workbench-review-layout'),
  );
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
