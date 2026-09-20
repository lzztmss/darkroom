import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisForm } from './AnalysisForm';

const { pushMock, saveHistoryMock, prepared } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  saveHistoryMock: vi.fn().mockResolvedValue(undefined),
  prepared: {
    name: 'portrait.jpg',
    dataUrl: 'data:image/jpeg;base64,abc',
    previewUrl: 'blob:portrait',
    mimeType: 'image/jpeg' as const,
    width: 1024,
    height: 2048,
    originalBytes: 8_000_000,
    analysisBytes: 900_000,
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('../history/history-store', () => ({ saveAnalysisHistory: saveHistoryMock }));
vi.mock('../upload/image-processing', async () => {
  const actual = await vi.importActual<typeof import('../upload/image-processing')>('../upload/image-processing');
  return { ...actual, prepareImage: vi.fn().mockResolvedValue(prepared) };
});

beforeEach(() => {
  pushMock.mockClear();
  saveHistoryMock.mockClear();
  sessionStorage.clear();
});

it('requires a real photo before analysis', () => {
  render(<AnalysisForm />);
  expect(screen.getByRole('button', { name: '开始分析' })).toBeDisabled();
  expect(screen.getByText('照片会完整显示，不会自动裁边。')).toBeVisible();
});

it('shows the complete prepared image and transmission size', async () => {
  render(<AnalysisForm />);
  fireEvent.change(screen.getByLabelText('选择照片'), {
    target: { files: [new File(['photo'], 'portrait.jpg', { type: 'image/jpeg' })] },
  });

  expect(await screen.findByAltText('portrait.jpg 的完整预览')).toBeVisible();
  expect(screen.getByText('屏幕预览：本地原图')).toBeVisible();
  expect(screen.getByText(/发送给 AI：1024 × 2048 · 879 KB/)).toBeVisible();
  expect(screen.getByLabelText('照片名称')).toHaveValue('portrait');
  expect(screen.getByText('换一张照片').closest('label')).toHaveClass('fill-action');
});

it('shows a waiting state without inventing a percentage progress fill', async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
  render(<AnalysisForm />);
  fireEvent.change(screen.getByLabelText('选择照片'), {
    target: { files: [new File(['photo'], 'portrait.jpg', { type: 'image/jpeg' })] },
  });
  await screen.findByAltText('portrait.jpg 的完整预览');
  await user.click(screen.getByRole('button', { name: '开始分析' }));

  expect(screen.getByRole('button', { name: '正在读取画面…' })).toBeDisabled();
  expect(document.querySelector('.analysis-action__progress')).not.toBeInTheDocument();
});

it('sends optional intent with the compressed image and opens the result', async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { overall_score: 80 } }), { status: 200 }));
  render(<AnalysisForm />);
  fireEvent.change(screen.getByLabelText('选择照片'), {
    target: { files: [new File(['photo'], 'portrait.jpg', { type: 'image/jpeg' })] },
  });
  await screen.findByAltText('portrait.jpg 的完整预览');
  await user.clear(screen.getByLabelText('照片名称'));
  await user.type(screen.getByLabelText('照片名称'), '暖夜酒吧');
  await user.type(screen.getByLabelText('创作意图'), '想表现雪地里的孤独感');
  await user.click(screen.getByRole('button', { name: '开始分析' }));

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/result'));
  expect(saveHistoryMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(sessionStorage.getItem('darkroom:last-analysis') ?? '{}')).toMatchObject({
    displayImageUrl: 'blob:portrait',
    imageDataUrl: 'data:image/jpeg;base64,abc',
    imageName: '暖夜酒吧',
    sourceImageName: 'portrait.jpg',
  });
  expect(saveHistoryMock).toHaveBeenCalledWith(expect.objectContaining({
    displayImageUrl: undefined,
    imageDataUrl: 'data:image/jpeg;base64,abc',
  }));
  expect(fetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({ method: 'POST' }));
});
