import { describe, it, expect } from 'vitest';
import { surfaceOf, figures, sanitize, encodePlan, decodePlan, placeFor, quadMatrix, applyMatrix, DEFAULT_PLAN, KINDS } from './plan';

const ID = 'abcdef0123456789abcdef01';

describe('pool builder plan', () => {
  it('works out the same surfaces as the server', () => {
    // backend/test/pool-builder.test.js checks these numbers too
    expect(surfaceOf('rectangle', 8, 4)).toBe(32);
    expect(Math.round(surfaceOf('oval', 8, 4) * 100) / 100).toBe(25.13);
    expect(Math.round(surfaceOf('rounded', 8, 4) * 100) / 100).toBe(31.14);
    expect(figures({ shape: 'rectangle', length: 8, width: 4, depth: 1.4 })).toEqual({ surface: 32, volume: 44.8, flow: 11.2 });
  });

  it('keeps a plan inside its garden and its limits', () => {
    const plan = sanitize({ garden: { width: 10, height: 100 }, pool: { shape: 'star', length: 30, width: 1, depth: 9, x: 50, y: -5 }, items: [{ product: 'nope', kind: 'pump' }, { product: ID, kind: 'robot', x: 99, y: 1 }] });
    expect(plan.garden).toEqual({ width: 10, height: 40 });
    expect(plan.pool).toMatchObject({ shape: 'rectangle', length: 10, width: 2, depth: 3, x: 0, y: 0 });
    expect(plan.items).toEqual([{ id: 'i0', product: ID, kind: 'robot', x: 10, y: 1 }]);
  });

  it('fits a whole plan in a link and reads it back', () => {
    const plan = { ...DEFAULT_PLAN, pool: { ...DEFAULT_PLAN.pool, shape: 'oval', length: 9.5 }, items: [{ id: 'x', product: ID, kind: 'filter', x: 12.25, y: 3.5 }] };
    const back = decodePlan(encodePlan(plan));
    expect(back.pool).toEqual(plan.pool);
    expect(back.items).toEqual([{ id: 'i0', product: ID, kind: 'filter', x: 12.25, y: 3.5 }]);
    expect(encodePlan(plan)).toMatch(/^[\w-]+$/);
    expect(decodePlan('not a plan')).toBeNull();
  });

  it('places equipment side by side, beside the pool, and on the other side when there is no room', () => {
    const first = placeFor('pump', DEFAULT_PLAN, 0);
    const second = placeFor('filter', DEFAULT_PLAN, 1);
    expect(first).not.toEqual(second);
    expect(first.x).toBeGreaterThan(DEFAULT_PLAN.pool.x + DEFAULT_PLAN.pool.length);
    const tight = { ...DEFAULT_PLAN, pool: { ...DEFAULT_PLAN.pool, x: 7 } };
    expect(placeFor('pump', tight, 0).x).toBeLessThan(tight.pool.x);
    expect(KINDS.light.place).toBe('wall');
    expect(placeFor('light', DEFAULT_PLAN, 0).y).toBe(DEFAULT_PLAN.pool.y);
  });

  it('lays the pool on a photo: the box corners land on the four points', () => {
    const points = [[120, 300], [520, 290], [640, 520], [40, 540]];
    const m = quadMatrix(400, 200, points);
    const landed = [[0, 0], [400, 0], [400, 200], [0, 200]].map(([x, y]) => applyMatrix(m, x, y).map(v => Math.round(v * 1000) / 1000));
    expect(landed).toEqual(points);
  });
});
