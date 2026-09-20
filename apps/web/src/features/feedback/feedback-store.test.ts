import { feedbackRecordsToCsv, loadFeedback, saveFeedback } from './feedback-store';

beforeEach(() => localStorage.clear());

it('saves and updates one evaluation locally by evaluation id', () => {
  saveFeedback({
    evaluationId: 'evaluation-1', photoId: 'photo-1', imageName: 'portrait.jpg',
    modelName: 'qwen', promptVersion: 'v1', ratings: { subject_accuracy: 2 },
    notes: '第一次', updatedAt: '2026-08-25T00:00:00.000Z',
  });
  saveFeedback({
    evaluationId: 'evaluation-1', photoId: 'photo-1', imageName: 'portrait.jpg',
    modelName: 'qwen', promptVersion: 'v1', ratings: { subject_accuracy: 1 },
    notes: '修改后', updatedAt: '2026-08-25T00:01:00.000Z',
  });

  expect(loadFeedback('evaluation-1')).toMatchObject({ notes: '修改后', ratings: { subject_accuracy: 1 } });
  expect(JSON.parse(localStorage.getItem('darkroom:human-feedback:v1') ?? '[]')).toHaveLength(1);
});

it('exports stable CSV columns and escapes notes', () => {
  const csv = feedbackRecordsToCsv([{
    evaluationId: 'evaluation-1', photoId: 'photo-1', imageName: 'portrait.jpg',
    modelName: 'qwen', promptVersion: 'v1', ratings: { subject_accuracy: 2 },
    notes: '框准，文案有“套话”', updatedAt: '2026-08-25T00:00:00.000Z',
  }]);

  expect(csv).toContain('evaluation_id,photo_id,image_name,model,prompt_version');
  expect(csv).toContain('subject_accuracy,line_restraint,crop_conservative');
  expect(csv).toContain('"框准，文案有“套话”"');
});
