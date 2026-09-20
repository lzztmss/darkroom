import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPrompt } from './qwen-adapter';

describe('Qwen workbench prompt', () => {
  it('embeds the original workbench schema verbatim and keeps intent from changing facts or scores', () => {
    const schema = readFileSync(
      resolve(process.cwd(), '..', '..', 'experiments/ai-analysis-eval/schema/analysis-result.schema.json'),
      'utf8',
    );
    const prompt = buildPrompt({
      image: {
        dataUrl: 'data:image/jpeg;base64,abc',
        width: 1200,
        height: 800,
        name: 'street.jpg',
      },
      context: {
        genre: '街头',
        intent: '想保留人物与环境之间的距离',
        focus: ['构图'],
      },
    });

    expect(prompt).toContain(schema);
    expect(prompt).toContain('box 必须严格使用 {"x":数值,"y":数值,"width":数值,"height":数值} 对象');
    expect(prompt).toContain('不能改变 observations，不能直接加分');
    expect(prompt).toContain('给出 1 到 3 个保守的参数起点');
    expect(prompt).toContain('色温向暖 +200～400K');
    expect(prompt).toContain('不得断言使用了直闪、跳闪、特定焦距、光圈、快门、ISO、镜头或其他拍摄设备与参数');
    expect(prompt).toContain('画面呈现类似较硬正面光源的视觉效果');
    expect(prompt).toContain('无法仅凭画面确认具体光源');
    expect(prompt).toContain('可以提出光圈、焦距、快门、ISO、闪光或用光方向的条件式建议');
    expect(prompt).toContain('若希望增加景深，可尝试缩小光圈（提高 f 值）');
  });
});
