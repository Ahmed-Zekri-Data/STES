import { describe, it, expect, beforeEach } from 'vitest';
import { whereWeAre, dateLabel, initialVolume, volumeOf } from './calendar';

const reminders = [
  { key: 'check', month: 2, day: 15 },
  { key: 'opening', month: 4, day: 1 },
  { key: 'winter', month: 11, day: 1 }
];

describe('pool care calendar', () => {
  beforeEach(() => localStorage.clear());

  it('knows the reminder happening now and the next one', () => {
    expect(whereWeAre(reminders, new Date(2027, 3, 10))).toEqual({ current: 'opening', next: 'winter' });
    expect(whereWeAre(reminders, new Date(2027, 5, 10))).toEqual({ current: null, next: 'winter' });
    // After the last one of the year, the next is next year's first
    expect(whereWeAre(reminders, new Date(2027, 11, 20))).toEqual({ current: null, next: 'check' });
    expect(whereWeAre([], new Date())).toEqual({ current: null, next: null });
  });

  it('writes dates the French way', () => {
    expect(dateLabel({ month: 4, day: 1 })).toBe('1er avril');
    expect(dateLabel({ month: 8, day: 15 })).toBe('15 août');
  });

  it('works out the volume, or takes it from the pool drawn in the builder', () => {
    expect(volumeOf(8, 4, 1.4)).toBe(44.8);
    expect(volumeOf(8, '', 1.4)).toBe('');
    expect(initialVolume()).toBe('');
    localStorage.setItem('stes-pool-plan', JSON.stringify({ pool: { shape: 'rectangle', length: 10, width: 5, depth: 1.5, x: 1, y: 1 } }));
    expect(initialVolume()).toBe(75);
  });
});
