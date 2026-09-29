import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AnalysisRequestSchema } from '../../../features/analysis/contract';
import { analyzeWithQwen } from '../../../server/model/qwen-adapter';

export const runtime = 'nodejs';

// A short-lived request cache makes a double click or browser retry reuse the
// same model call. It is intentionally process-local for the local MVP; a
// hosted deployment can move this map to its billing/idempotency store.
const activeRequests = new Map<string, { startedAt: number; promise: Promise<unknown> }>();
const REQUEST_CACHE_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  let input;
  try {
    input = AnalysisRequestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '照片或填写内容不完整，请重新选择照片后再试' }, { status: 422 });
    }
    return NextResponse.json({ error: '无法读取这次分析请求，请重新选择照片后再试' }, { status: 422 });
  }

  try {
    const requestIdHeader = request.headers.get('x-analysis-request-id')?.trim();
    const requestId = requestIdHeader && /^[a-zA-Z0-9-]{8,100}$/u.test(requestIdHeader)
      ? requestIdHeader
      : null;
    const now = Date.now();
    for (const [id, entry] of activeRequests) {
      if (now - entry.startedAt > REQUEST_CACHE_MS) activeRequests.delete(id);
    }
    const existing = requestId ? activeRequests.get(requestId) : undefined;
    if (existing) {
      return NextResponse.json({ result: await existing.promise, reused: true });
    }

    const promise = analyzeWithQwen(input, request.signal);
    if (requestId) activeRequests.set(requestId, { startedAt: now, promise });
    let result;
    try {
      result = await promise;
    } catch (error) {
      if (requestId) activeRequests.delete(requestId);
      throw error;
    }
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: '分析已取消' }, { status: 499 });
    }
    const message = error instanceof Error ? error.message : '分析失败，请稍后重试';
    console.error('[analysis]', message);
    const status = /额度|quota|429/iu.test(message) ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
