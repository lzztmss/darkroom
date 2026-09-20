export const FEEDBACK_STORAGE_KEY = 'darkroom:human-feedback:v1';

export const feedbackCriteria = [
  ['subject_accuracy', '主体框准确'],
  ['line_restraint', '引导线克制'],
  ['crop_conservative', '裁切保守'],
  ['copy_specific', '文案具体'],
  ['copy_non_template', '非模板化'],
  ['low_confidence_hidden', '低置信度隐藏'],
] as const;

export type FeedbackCriterion = typeof feedbackCriteria[number][0];
export type FeedbackRating = 0 | 1 | 2;

export type FeedbackRecord = {
  evaluationId: string;
  photoId: string;
  imageName: string;
  modelName: string;
  promptVersion: string;
  ratings: Partial<Record<FeedbackCriterion, FeedbackRating>>;
  notes: string;
  updatedAt: string;
};

function readRecords(): FeedbackRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadFeedback(evaluationId: string) {
  return readRecords().find((record) => record.evaluationId === evaluationId) ?? null;
}

export function saveFeedback(record: FeedbackRecord) {
  const records = readRecords();
  const existingIndex = records.findIndex((item) => item.evaluationId === record.evaluationId);
  if (existingIndex >= 0) records[existingIndex] = record;
  else records.unshift(record);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(records.slice(0, 200)));
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function feedbackRecordsToCsv(records = readRecords()) {
  const columns = [
    'evaluation_id', 'photo_id', 'image_name', 'model', 'prompt_version',
    ...feedbackCriteria.map(([key]) => key), 'notes', 'updated_at',
  ];
  const rows = records.map((record) => {
    const values: Record<string, unknown> = {
      evaluation_id: record.evaluationId,
      photo_id: record.photoId,
      image_name: record.imageName,
      model: record.modelName,
      prompt_version: record.promptVersion,
      notes: record.notes,
      updated_at: record.updatedAt,
      ...record.ratings,
    };
    return columns.map((column) => csvEscape(values[column])).join(',');
  });
  return [columns.join(','), ...rows].join('\n');
}

export function downloadFeedbackCsv() {
  const csv = feedbackRecordsToCsv();
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'darkroom-human-feedback.csv';
  link.click();
  URL.revokeObjectURL(url);
}
