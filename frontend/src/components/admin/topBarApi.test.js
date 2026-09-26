import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatTND, timeAgo } from './topBarApi';

describe('formatTND', () => {
  it('shows three decimals, as for millimes', () => {
    expect(formatTND(1016.5)).toBe('1016.500 TND');
    expect(formatTND(undefined)).toBe('0.000 TND');
  });
});

describe('timeAgo', () => {
  afterEach(() => vi.useRealTimers());

  it('describes how long ago something happened', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T12:00:00Z'));

    expect(timeAgo('2026-09-26T11:59:40Z')).toBe('just now');
    expect(timeAgo('2026-09-26T11:45:00Z')).toBe('15 min ago');
    expect(timeAgo('2026-09-26T09:00:00Z')).toBe('3 h ago');
    expect(timeAgo('2026-09-25T10:00:00Z')).toBe('yesterday');
    expect(timeAgo('2026-09-20T12:00:00Z')).toBe('6 days ago');
  });
});
