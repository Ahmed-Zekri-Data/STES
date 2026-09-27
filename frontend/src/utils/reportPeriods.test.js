import { describe, it, expect } from 'vitest';
import { presetRange } from './reportPeriods';

describe('report periods', () => {
  const today = new Date(2026, 2, 15); // 15 March 2026

  it('counts today in the last 7 and 30 days', () => {
    expect(presetRange('last7', today)).toEqual(['2026-03-09', '2026-03-15']);
    expect(presetRange('last30', today)).toEqual(['2026-02-14', '2026-03-15']);
  });

  it('knows the calendar months and years', () => {
    expect(presetRange('thisMonth', today)).toEqual(['2026-03-01', '2026-03-15']);
    expect(presetRange('lastMonth', today)).toEqual(['2026-02-01', '2026-02-28']);
    expect(presetRange('thisYear', today)).toEqual(['2026-01-01', '2026-03-15']);
    expect(presetRange('lastYear', today)).toEqual(['2025-01-01', '2025-12-31']);
    expect(presetRange('lastMonth', new Date(2026, 0, 10))).toEqual(['2025-12-01', '2025-12-31']);
  });
});
