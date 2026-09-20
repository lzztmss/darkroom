import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AnalysisRequestSchema } from '../../../features/analysis/contract';
import { analyzeWithQwen } from '../../../server/model/qwen-adapter';

export const runtime = 'nodejs';

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
    const result = await analyzeWithQwen(input);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析失败，请稍后重试';
    console.error('[analysis]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
