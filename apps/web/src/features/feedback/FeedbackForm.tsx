'use client';

import { useEffect, useState } from 'react';
import {
  downloadFeedbackCsv,
  feedbackCriteria,
  FeedbackCriterion,
  FeedbackRating,
  loadFeedback,
  saveFeedback,
} from './feedback-store';

type FeedbackFormProps = {
  evaluationId: string;
  photoId: string;
  imageName: string;
  modelName: string;
  promptVersion: string;
};

export function FeedbackForm(props: FeedbackFormProps) {
  const [ratings, setRatings] = useState<Partial<Record<FeedbackCriterion, FeedbackRating>>>({});
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadFeedback(props.evaluationId);
      if (saved) {
        setRatings(saved.ratings);
        setNotes(saved.notes);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [props.evaluationId]);

  function updateRating(key: FeedbackCriterion, value: string) {
    setRatings((current) => {
      if (value === '') {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: Number(value) as FeedbackRating };
    });
    setStatus('');
  }

  function save() {
    saveFeedback({
      evaluationId: props.evaluationId,
      photoId: props.photoId,
      imageName: props.imageName,
      modelName: props.modelName,
      promptVersion: props.promptVersion,
      ratings,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
    setStatus('反馈已保存在当前浏览器。');
  }

  return (
    <section className="workbench-feedback" aria-labelledby="feedback-title">
      <div className="workbench-feedback-heading">
        <div>
          <p className="workbench-eyebrow">人工反馈 · 0 / 1 / 2</p>
          <h2 id="feedback-title">这次点评是否真的可靠？</h2>
        </div>
        <p>只保存评分、文件名和备注，不保存照片。</p>
      </div>

      <div className="workbench-feedback-fields">
        {feedbackCriteria.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <select aria-label={label} onChange={(event) => updateRating(key, event.target.value)} value={ratings[key] ?? ''}>
              <option value="">未评</option>
              <option value="0">0 · 错误 / 误导</option>
              <option value="1">1 · 部分可用</option>
              <option value="2">2 · 准确 / 克制</option>
            </select>
          </label>
        ))}
      </div>

      <label className="workbench-feedback-notes">
        <span>严重错误与备注</span>
        <textarea aria-label="严重错误与备注" onChange={(event) => { setNotes(event.target.value); setStatus(''); }} placeholder="记录编造事实、乱画、裁断主体、模板化表达等。" value={notes} />
      </label>

      <div className="workbench-feedback-actions">
        <button className="workbench-fill-action" onClick={save} type="button"><span>保存本次反馈</span></button>
        <button className="workbench-fill-action" onClick={() => { downloadFeedbackCsv(); setStatus('反馈 CSV 已导出。'); }} type="button"><span>导出反馈 CSV</span></button>
        <p aria-live="polite">{status}</p>
      </div>
    </section>
  );
}
