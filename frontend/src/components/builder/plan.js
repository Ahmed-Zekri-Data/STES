// "Construire ma piscine": the plan a visitor draws, and its figures. The
// server prices plans sent with a quote the same way
// (backend/services/poolPlanService.js): keep the two in step.

export const SHAPES = [
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'rounded', label: 'Arrondie' },
  { id: 'oval', label: 'Ovale' }
];
export const LIMITS = { length: [2, 20], width: [2, 12], depth: [0.8, 3], garden: [6, 40] };
const TURNOVER_HOURS = 4;

// How each kind of equipment is drawn on the plan: size in metres, and
// where it goes when added without dragging
export const KINDS = {
  pump: { label: 'Pompe', w: 0.9, h: 0.5, place: 'room' },
  filter: { label: 'Filtre', w: 0.7, h: 0.7, round: true, place: 'room' },
  heat: { label: 'Pompe à chaleur', w: 1, h: 0.55, place: 'room' },
  light: { label: 'Éclairage', w: 0.34, h: 0.34, round: true, place: 'wall' },
  robot: { label: 'Robot', w: 0.55, h: 0.45, place: 'water' },
  ladder: { label: 'Échelle', w: 0.7, h: 0.5, place: 'edge' },
  shower: { label: 'Douche', w: 0.5, h: 0.5, round: true, place: 'deck' },
  cover: { label: 'Couverture', w: 1.3, h: 0.35, place: 'end' },
  other: { label: 'Équipement', w: 0.6, h: 0.6, place: 'deck' }
};

export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const snap = (value, step = 0.1) => Math.round(value / step) * step;
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

export const surfaceOf = (shape, length, width) => {
  if (shape === 'oval') return (Math.PI / 4) * length * width;
  if (shape === 'rounded') {
    const r = Math.min(length, width) * 0.25;
    return length * width - (4 - Math.PI) * r * r;
  }
  return length * width;
};

// The pool's corner radius on the plan (m)
export const cornerRadius = ({ shape, length, width }) => (shape === 'oval' ? Math.min(length, width) / 2 : shape === 'rounded' ? Math.min(length, width) * 0.25 : 0.05);

export const figures = (pool) => {
  const surface = round(surfaceOf(pool.shape, pool.length, pool.width));
  const volume = round(surface * pool.depth);
  return { surface, volume, flow: round(volume / TURNOVER_HOURS) };
};

export const DEFAULT_PLAN = {
  garden: { width: 16, height: 12 },
  pool: { shape: 'rectangle', x: 3, y: 3, length: 8, width: 4, depth: 1.4 },
  items: []
};

// A plan read from a link or storage, kept within the limits
export const sanitize = (raw) => {
  const plan = raw && typeof raw === 'object' ? raw : {};
  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const garden = {
    width: clamp(num(plan.garden?.width, 16), ...LIMITS.garden),
    height: clamp(num(plan.garden?.height, 12), ...LIMITS.garden)
  };
  const p = plan.pool || {};
  const length = clamp(num(p.length, 8), LIMITS.length[0], Math.min(LIMITS.length[1], garden.width));
  const width = clamp(num(p.width, 4), LIMITS.width[0], Math.min(LIMITS.width[1], garden.height));
  const pool = {
    shape: SHAPES.some(s => s.id === p.shape) ? p.shape : 'rectangle',
    length, width,
    depth: clamp(num(p.depth, 1.4), ...LIMITS.depth),
    x: clamp(num(p.x, 0), 0, garden.width - length),
    y: clamp(num(p.y, 0), 0, garden.height - width)
  };
  const items = (Array.isArray(plan.items) ? plan.items : [])
    // A product, or "<product>:<version code>" (see keyOf in PoolBuilder)
    .filter(item => item && /^[a-f\d]{24}(:[^:]{1,40})?$/i.test(String(item.product)) && KINDS[item.kind])
    .slice(0, 40)
    .map((item, i) => ({
      id: String(item.id || `i${i}`),
      product: String(item.product),
      kind: item.kind,
      x: clamp(num(item.x, 0), 0, garden.width),
      y: clamp(num(item.y, 0), 0, garden.height)
    }));
  return { garden, pool, items };
};

// The plan in a link: compact JSON in base64url
export const encodePlan = (plan) => {
  const compact = { g: [plan.garden.width, plan.garden.height], p: [plan.pool.shape, plan.pool.x, plan.pool.y, plan.pool.length, plan.pool.width, plan.pool.depth].map(v => (typeof v === 'number' ? round(v, 2) : v)), i: plan.items.map(item => [item.product, item.kind, round(item.x, 2), round(item.y, 2)]) };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decodePlan = (text) => {
  try {
    const binary = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
    const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, ch => ch.charCodeAt(0))));
    const [shape, x, y, length, width, depth] = c.p;
    return sanitize({
      garden: { width: c.g[0], height: c.g[1] },
      pool: { shape, x, y, length, width, depth },
      items: c.i.map(([product, kind, ix, iy], n) => ({ id: `i${n}`, product, kind, x: ix, y: iy }))
    });
  } catch {
    return null;
  }
};

// Where an item goes when added with a click: equipment room beside the
// pool, lights on the long walls, the robot in the water... `index` counts
// the items already placed the same way, so they sit side by side.
export const placeFor = (kind, plan, index) => {
  const { pool, garden } = plan;
  const k = KINDS[kind] || KINDS.other;
  // The equipment room goes right of the pool, or left when there is no room
  const roomRight = pool.x + pool.length + 1.2 + 1.1 + k.w / 2 <= garden.width;
  const roomX = roomRight ? pool.x + pool.length + 1.2 + (index % 2) * 1.1 : pool.x - 1.2 - (index % 2) * 1.1;
  const inside = (x, y) => ({ x: clamp(x, k.w / 2, garden.width - k.w / 2), y: clamp(y, k.h / 2, garden.height - k.h / 2) });
  switch (k.place) {
    case 'room': return inside(roomX, pool.y + 0.6 + Math.floor(index / 2) * 0.9);
    case 'wall': return { x: pool.x + pool.length * ((index % 3) + 1) / 4, y: index % 2 ? pool.y + pool.width : pool.y };
    case 'water': return { x: pool.x + pool.length * 0.35 + index * 0.6, y: pool.y + pool.width * 0.6 };
    case 'edge': return { x: pool.x + 0.6 + index * 1.2, y: pool.y + pool.width + 0.1 };
    case 'end': return inside(pool.x - 0.4, pool.y + pool.width / 2);
    default: return inside(pool.x + pool.length + 1 + index * 0.8, pool.y + pool.width + 1);
  }
};

// Perspective: the CSS matrix3d that maps a w × h box onto the four
// points (top-left, top-right, bottom-right, bottom-left), for drawing the
// pool on a photo of the garden (Heckbert's square-to-quad mapping)
export const quadMatrix = (w, h, [p0, p1, p2, p3]) => {
  const [x0, y0] = p0, [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, hh = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const det = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    hh = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  return [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
};

// Where a point of the box lands with that matrix (for tests)
export const applyMatrix = (m, x, y) => {
  const X = m[0] * x + m[4] * y + m[12];
  const Y = m[1] * x + m[5] * y + m[13];
  const W = m[3] * x + m[7] * y + m[15];
  return [X / W, Y / W];
};

export const metres = (value) => `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m`;
