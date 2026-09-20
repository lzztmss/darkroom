import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { historicalSlides } from '../prototype/fixtures';
import { ContactSheetCarousel } from './ContactSheetCarousel';

it('moves through the three local historical photographs', async () => {
  const user = userEvent.setup();
  render(<ContactSheetCarousel slides={historicalSlides} />);

  expect(screen.getByText('01 / 03')).toBeVisible();
  expect(screen.getByRole('img', { name: 'The Tetons and Snake River' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: '下一张' }));

  expect(screen.getByText('02 / 03')).toBeVisible();
  expect(screen.getByRole('img', { name: 'Two Medicine Lake' })).toBeVisible();
});

it('wraps from the first photograph to the last', async () => {
  const user = userEvent.setup();
  render(<ContactSheetCarousel slides={historicalSlides} />);

  await user.click(screen.getByRole('button', { name: '上一张' }));

  expect(screen.getByText('03 / 03')).toBeVisible();
  expect(screen.getByRole('img', { name: 'Railway cars in Arizona' })).toBeVisible();
});

it('reveals the contact sheet once it enters the reading flow', () => {
  render(<ContactSheetCarousel slides={historicalSlides} />);

  expect(screen.getByLabelText('摄影史作品接触印样')).toHaveClass('contact-sheet--revealed');
});
