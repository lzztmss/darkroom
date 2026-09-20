import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryExperience } from './HistoryExperience';

const { deleteMock, listMock, pushMock, record } = vi.hoisted(() => ({
  deleteMock: vi.fn().mockResolvedValue(undefined),
  listMock: vi.fn(),
  pushMock: vi.fn(),
  record: {
    id: 'history-1',
    createdAt: '2026-08-25T08:00:00.000Z',
    imageDataUrl: 'data:image/jpeg;base64,abc',
    imageName: 'street.jpg',
    intent: '',
    genre: '街头',
    focus: ['构图'],
    result: { overall_score: 82 },
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('../../features/history/history-store', () => ({
  deleteAnalysisHistory: deleteMock,
  listAnalysisHistory: listMock,
}));

beforeEach(() => {
  deleteMock.mockClear();
  listMock.mockReset().mockResolvedValue([record]);
  pushMock.mockClear();
  sessionStorage.clear();
});

it('lists locally saved analyses and opens a selected critique', async () => {
  const user = userEvent.setup();
  render(<HistoryExperience />);

  expect(await screen.findByRole('heading', { name: 'street.jpg' })).toBeVisible();
  expect(screen.getByText('街头 · 快速索引 82')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '查看点评' }));

  expect(pushMock).toHaveBeenCalledWith('/result');
  expect(sessionStorage.getItem('darkroom:last-analysis')).toContain('street.jpg');
});

it('lets the user delete a local history item', async () => {
  const user = userEvent.setup();
  render(<HistoryExperience />);
  await screen.findByRole('heading', { name: 'street.jpg' });
  await user.click(screen.getByRole('button', { name: '删除' }));

  await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('history-1'));
  expect(screen.queryByRole('heading', { name: 'street.jpg' })).not.toBeInTheDocument();
});

it('searches history by custom name, source filename, genre, and intent', async () => {
  const user = userEvent.setup();
  listMock.mockResolvedValue([
    { ...record, imageName: '暖夜酒吧', sourceImageName: 'R0001103.JPG', intent: '保留朋友相聚的气氛' },
    { ...record, id: 'history-2', imageName: '雪夜路口', sourceImageName: 'snow.jpg', genre: '城市空间', intent: '' },
  ]);
  render(<HistoryExperience />);
  await screen.findByRole('heading', { name: '暖夜酒吧' });

  await user.type(screen.getByRole('searchbox', { name: '搜索历史记录' }), 'R0001103');
  expect(screen.getByRole('heading', { name: '暖夜酒吧' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '雪夜路口' })).not.toBeInTheDocument();

  await user.clear(screen.getByRole('searchbox', { name: '搜索历史记录' }));
  await user.type(screen.getByRole('searchbox', { name: '搜索历史记录' }), '城市空间');
  expect(screen.getByRole('heading', { name: '雪夜路口' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '暖夜酒吧' })).not.toBeInTheDocument();
});
