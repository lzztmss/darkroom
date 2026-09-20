const MAX_LONG_EDGE = 1600;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const TARGET_BYTES = 1.2 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ResizePlan = {
  width: number;
  height: number;
  resized: boolean;
};

export type PreparedImage = {
  name: string;
  dataUrl: string;
  previewUrl: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  originalBytes: number;
  analysisBytes: number;
};

export function buildResizePlan(
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge = MAX_LONG_EDGE,
): ResizePlan {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error('图片尺寸无效');
  }

  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= maxLongEdge) {
    return { width: Math.round(sourceWidth), height: Math.round(sourceHeight), resized: false };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
    resized: true,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('无法生成分析副本'))),
      'image/jpeg',
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('无法读取分析副本'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error('目前支持 JPEG、PNG 和 WebP 图片');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('图片不能超过 25MB');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('无法读取这张图片，请尝试转换为 JPEG 后再试');
  }

  try {
    const plan = buildResizePlan(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = plan.width;
    canvas.height = plan.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法处理图片');

    context.fillStyle = '#0a0a09';
    context.fillRect(0, 0, plan.width, plan.height);
    context.drawImage(bitmap, 0, 0, plan.width, plan.height);

    let quality = 0.84;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > TARGET_BYTES && quality > 0.68) {
      quality = Math.max(0.68, quality - 0.05);
      blob = await canvasToBlob(canvas, quality);
    }

    return {
      name: file.name,
      dataUrl: await blobToDataUrl(blob),
      previewUrl: URL.createObjectURL(file),
      mimeType: 'image/jpeg',
      width: plan.width,
      height: plan.height,
      originalBytes: file.size,
      analysisBytes: blob.size,
    };
  } finally {
    bitmap.close();
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
