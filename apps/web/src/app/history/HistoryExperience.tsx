'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ANALYSIS_STORAGE_KEY } from '../../features/analysis/contract';
import {
  AnalysisHistoryRecord,
  DEFAULT_LOCAL_ORIGIN,
  deleteAnalysisHistory,
  getHistoryOriginHint,
  listAnalysisHistory,
} from '../../features/history/history-store';

export function HistoryExperience() {
  const router = useRouter();
  const [records, setRecords] = useState<AnalysisHistoryRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const storageOrigin = typeof window === 'undefined' ? '' : window.location.origin;

  useEffect(() => {
    void listAnalysisHistory()
      .then(setRecords)
      .catch(() => setError('无法读取这个浏览器里的历史记录。'))
      .finally(() => setLoaded(true));
  }, []);

  function openRecord(record: AnalysisHistoryRecord) {
    const { id: _id, createdAt: _createdAt, ...stored } = record;
    sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(stored));
    router.push('/result');
  }

  async function removeRecord(id: string) {
    await deleteAnalysisHistory(id);
    setRecords((current) => current.filter((record) => record.id !== id));
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const filteredRecords = normalizedQuery
    ? records.filter((record) => [
        record.imageName,
        record.sourceImageName,
        record.genre,
        record.intent,
        ...(record.focus ?? []),
      ].some((value) => String(value ?? '').toLocaleLowerCase('zh-CN').includes(normalizedQuery)))
    : records;

  return (
    <main className="history-page">
      <header className="history-header">
        <div><p>只保存在当前浏览器</p><h1>历史记录</h1></div>
        <Link className="fill-action" href="/analyze"><span>分析新照片</span></Link>
      </header>

      <section className="history-content">
        <div className="history-search">
          <label htmlFor="history-search">搜索历史记录</label>
          <input id="history-search" onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、原文件名、类型或创作意图" type="search" value={query} />
          <span>{normalizedQuery ? `${filteredRecords.length} 条匹配` : `${records.length} 条记录`}</span>
        </div>
        {!loaded && <p className="history-empty">正在读取…</p>}
        {error && <p className="history-empty" role="alert">{error}</p>}
        {loaded && !error && records.length === 0 && (
          <div className="history-empty">
            <p>还没有保存过照片分析。</p>
            {storageOrigin && storageOrigin !== DEFAULT_LOCAL_ORIGIN && (
              <p className="history-storage-hint" role="status">
                {getHistoryOriginHint(storageOrigin)}
                {' '}
                <a href={`${DEFAULT_LOCAL_ORIGIN}/history`}>打开原地址</a>
              </p>
            )}
            <Link href="/analyze">选择第一张照片</Link>
          </div>
        )}
        {loaded && !error && records.length > 0 && filteredRecords.length === 0 && <p className="history-empty">没有找到匹配的照片。</p>}
        <div className="history-grid">
          {filteredRecords.map((record) => (
            <article className="history-card" key={record.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${record.imageName} 的历史缩略图`} src={record.imageDataUrl} />
              <div className="history-card-copy">
                <p>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.createdAt))}</p>
                <h2>{record.imageName}</h2>
                <span>{record.genre || '未指定类型'} · 快速索引 {record.result.overall_score}</span>
                <div>
                  <button className="fill-action" onClick={() => openRecord(record)} type="button"><span>查看点评</span></button>
                  <button className="history-delete" onClick={() => void removeRecord(record.id)} type="button">删除</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
