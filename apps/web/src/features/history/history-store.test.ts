import { DEFAULT_LOCAL_ORIGIN, getHistoryOriginHint } from './history-store';

it('explains when the app is opened on a different local origin', () => {
  expect(getHistoryOriginHint(DEFAULT_LOCAL_ORIGIN)).toBeNull();
  expect(getHistoryOriginHint('http://localhost:3000')).toContain(DEFAULT_LOCAL_ORIGIN);
});
