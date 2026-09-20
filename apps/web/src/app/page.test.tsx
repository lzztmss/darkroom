import { render, screen } from '@testing-library/react';
import HomePage from './page';

it('connects the restored landing page to the local analysis workflow', () => {
  render(<HomePage />);
  expect(screen.getByRole('heading', { name: '让照片被认真地看见。' })).toBeVisible();
  expect(screen.getByRole('link', { name: '开始分析' })).toHaveAttribute('href', '/analyze');
  expect(screen.getByText('本地版 · 原图不修改')).toBeVisible();
});
