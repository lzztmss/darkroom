import { describe, expect, it } from 'vitest';
import { buildResizePlan } from './image-processing';

describe('buildResizePlan', () => {
  it('limits a large landscape image to a 1440 pixel long edge for faster model input', () => {
    expect(buildResizePlan(6000, 4000)).toEqual({ width: 1440, height: 960, resized: true });
  });

  it('preserves a portrait image aspect ratio', () => {
    expect(buildResizePlan(3000, 6000)).toEqual({ width: 720, height: 1440, resized: true });
  });

  it('does not enlarge a smaller image', () => {
    expect(buildResizePlan(1200, 800)).toEqual({ width: 1200, height: 800, resized: false });
  });

  it('rejects invalid image dimensions', () => {
    expect(() => buildResizePlan(0, 1200)).toThrow('图片尺寸无效');
  });
});
