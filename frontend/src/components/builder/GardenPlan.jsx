import React, { useRef, useState } from 'react';
import { Box } from 'lucide-react';
import { KIND_ICONS } from './kindIcons';
import { KINDS, LIMITS, clamp, snap, cornerRadius, metres } from './plan';

const KIND_COLOURS = { pump: '#1f282d', filter: '#0e6f86', heat: '#e8eef1', light: '#fff6c8', robot: '#12b6cc', ladder: '#b8c4ca', shower: '#d6e3e8', cover: '#3a4a52', other: '#6b7c85' };
const DARK_GLYPH = new Set(['heat', 'light', 'ladder', 'shower']);
const DECK = 0.8;

// The garden seen from above, in metres: the pool (move it, drag its
// corners to resize) and the equipment (drag to place). Everything can also
// be moved with the keyboard: arrows (Shift: 1 m), Delete to remove.
const GardenPlan = ({ plan, onChange, names, selected, onSelect, onDropProduct }) => {
  const svg = useRef(null);
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);
  const { garden, pool, items } = plan;

  const point = (event) => {
    const matrix = svg.current.getScreenCTM().inverse();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  };

  const setPool = (changes) => onChange(current => ({ ...current, pool: { ...current.pool, ...changes } }));
  const moveItem = (id, x, y) => onChange(current => ({
    ...current,
    items: current.items.map(item => (item.id === id ? { ...item, x: clamp(snap(x, 0.05), 0, current.garden.width), y: clamp(snap(y, 0.05), 0, current.garden.height) } : item))
  }));

  const start = (event, target) => {
    event.stopPropagation();
    event.preventDefault();
    svg.current.setPointerCapture(event.pointerId);
    drag.current = { ...target, from: point(event), pool: { ...pool }, item: target.id && items.find(i => i.id === target.id) };
    setDragging(true);
    onSelect(target.id || 'pool');
  };

  const move = (event) => {
    const d = drag.current;
    if (!d) return;
    const p = point(event);
    const dx = p.x - d.from.x, dy = p.y - d.from.y;
    if (d.type === 'item') { moveItem(d.id, d.item.x + dx, d.item.y + dy); return; }
    const o = d.pool;
    if (d.type === 'pool') {
      setPool({ x: clamp(snap(o.x + dx), 0, garden.width - o.length), y: clamp(snap(o.y + dy), 0, garden.height - o.width) });
      return;
    }
    // Resize from a corner; the opposite corner stays put
    const left = d.corner === 0 || d.corner === 3, top = d.corner === 0 || d.corner === 1;
    const x1 = o.x, x2 = o.x + o.length, y1 = o.y, y2 = o.y + o.width;
    const [minL, maxL] = LIMITS.length, [minW, maxW] = LIMITS.width;
    let nx1 = x1, nx2 = x2, ny1 = y1, ny2 = y2;
    if (left) nx1 = clamp(snap(x1 + dx), Math.max(0, x2 - maxL), x2 - minL); else nx2 = clamp(snap(x2 + dx), x1 + minL, Math.min(garden.width, x1 + maxL));
    if (top) ny1 = clamp(snap(y1 + dy), Math.max(0, y2 - maxW), y2 - minW); else ny2 = clamp(snap(y2 + dy), y1 + minW, Math.min(garden.height, y1 + maxW));
    setPool({ x: nx1, y: ny1, length: Number((nx2 - nx1).toFixed(1)), width: Number((ny2 - ny1).toFixed(1)) });
  };

  const end = () => { drag.current = null; setDragging(false); };

  const onKey = (event, id) => {
    const step = event.shiftKey ? 1 : 0.1;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (delta) {
      event.preventDefault();
      if (id === 'pool') setPool({ x: clamp(snap(pool.x + delta[0]), 0, garden.width - pool.length), y: clamp(snap(pool.y + delta[1]), 0, garden.height - pool.width) });
      else { const item = items.find(i => i.id === id); moveItem(id, item.x + delta[0], item.y + delta[1]); }
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && id !== 'pool') {
      event.preventDefault();
      onChange(current => ({ ...current, items: current.items.filter(i => i.id !== id) }));
      onSelect(null);
    }
  };

  const drop = (event) => {
    const product = event.dataTransfer.getData('text/plain');
    if (!product) return;
    event.preventDefault();
    onDropProduct(product, point(event));
  };

  const r = cornerRadius(pool);
  const corners = [[pool.x, pool.y], [pool.x + pool.length, pool.y], [pool.x + pool.length, pool.y + pool.width], [pool.x, pool.y + pool.width]];
  const label = { fontSize: 0.36, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700 };

  return (
    <svg
      ref={svg}
      viewBox={`-1 -1 ${garden.width + 2} ${garden.height + 2}`}
      className={`block w-full touch-none select-none ${dragging ? 'cursor-grabbing' : ''}`}
      role="application"
      aria-label={`Plan du terrain de ${metres(garden.width)} sur ${metres(garden.height)}`}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerDown={() => onSelect(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
    >
      <defs>
        <pattern id="bp-grass" width="1" height="1" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#4f8f3a" />
          <rect width="0.5" height="1" fill="#57983f" />
        </pattern>
        <pattern id="bp-grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M1 0H0V1" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="0.02" />
        </pattern>
        <pattern id="bp-water" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#2bb7cf" />
          <image href="/plongee/caustics.png" width="3" height="3" opacity="0.5" />
        </pattern>
        <linearGradient id="bp-depth" x1="0" x2="1">
          <stop offset="0" stopColor="#8fe6f2" stopOpacity="0.35" />
          <stop offset="1" stopColor="#054a63" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Garden, grid and scale */}
      <rect width={garden.width} height={garden.height} rx="0.2" fill="url(#bp-grass)" />
      <rect width={garden.width} height={garden.height} fill="url(#bp-grid)" />
      <rect width={garden.width} height={garden.height} rx="0.2" fill="none" stroke="#2f5d23" strokeWidth="0.08" />
      <text x={garden.width / 2} y="-0.35" textAnchor="middle" fill="currentColor" style={label}>{metres(garden.width)}</text>
      <text x="-0.35" y={garden.height / 2} textAnchor="middle" fill="currentColor" style={label} transform={`rotate(-90 -0.35 ${garden.height / 2})`}>{metres(garden.height)}</text>

      {/* Pool: stone deck, water, measurements, corner handles */}
      <g
        tabIndex={0}
        role="button"
        aria-label={`Piscine de ${metres(pool.length)} sur ${metres(pool.width)}. Flèches pour déplacer.`}
        onPointerDown={(event) => start(event, { type: 'pool' })}
        onKeyDown={(event) => onKey(event, 'pool')}
        onFocus={() => onSelect('pool')}
        className="cursor-grab outline-none"
      >
        <rect x={pool.x - DECK} y={pool.y - DECK} width={pool.length + DECK * 2} height={pool.width + DECK * 2} rx={r + DECK * 0.6} fill="#e3d5bb" stroke="#cdbb9b" strokeWidth="0.04" />
        <rect x={pool.x} y={pool.y} width={pool.length} height={pool.width} rx={r} fill="url(#bp-water)" stroke="#f3ede2" strokeWidth="0.12" />
        <rect x={pool.x} y={pool.y} width={pool.length} height={pool.width} rx={r} fill="url(#bp-depth)" />
        <text x={pool.x + pool.length / 2} y={pool.y + pool.width / 2 + 0.14} textAnchor="middle" fill="#fff" style={{ ...label, fontSize: 0.42 }}>{metres(pool.length)} × {metres(pool.width)}</text>
        {selected === 'pool' && <rect x={pool.x - DECK - 0.1} y={pool.y - DECK - 0.1} width={pool.length + DECK * 2 + 0.2} height={pool.width + DECK * 2 + 0.2} rx={r + DECK} fill="none" stroke="#33e0f0" strokeWidth="0.06" strokeDasharray="0.25 0.15" />}
      </g>
      {corners.map(([cx, cy], corner) => (
        <circle
          key={corner}
          cx={cx}
          cy={cy}
          r="0.26"
          fill="#fff"
          stroke="#0e7f98"
          strokeWidth="0.07"
          className={corner % 2 ? 'cursor-nesw-resize' : 'cursor-nwse-resize'}
          onPointerDown={(event) => start(event, { type: 'resize', corner })}
        >
          <title>Tirer pour agrandir ou réduire la piscine</title>
        </circle>
      ))}

      {/* Equipment */}
      {items.map(item => {
        const kind = KINDS[item.kind] || KINDS.other;
        const Icon = KIND_ICONS[item.kind] || Box;
        const size = Math.min(kind.w, kind.h) * 0.72;
        const isSelected = selected === item.id;
        return (
          <g
            key={item.id}
            transform={`translate(${item.x} ${item.y})`}
            tabIndex={0}
            role="button"
            aria-label={`${names[item.product] || kind.label}. Flèches pour déplacer, Suppr pour retirer.`}
            onPointerDown={(event) => start(event, { type: 'item', id: item.id })}
            onKeyDown={(event) => onKey(event, item.id)}
            onFocus={() => onSelect(item.id)}
            className="cursor-grab outline-none"
          >
            <title>{names[item.product] || kind.label}</title>
            {kind.round
              ? <circle r={kind.w / 2} fill={KIND_COLOURS[item.kind]} stroke={isSelected ? '#33e0f0' : 'rgb(0 0 0 / 0.35)'} strokeWidth={isSelected ? 0.08 : 0.03} />
              : <rect x={-kind.w / 2} y={-kind.h / 2} width={kind.w} height={kind.h} rx="0.08" fill={KIND_COLOURS[item.kind]} stroke={isSelected ? '#33e0f0' : 'rgb(0 0 0 / 0.35)'} strokeWidth={isSelected ? 0.08 : 0.03} />}
            <Icon x={-size / 2} y={-size / 2} width={size} height={size} color={DARK_GLYPH.has(item.kind) ? '#1f282d' : '#ffffff'} strokeWidth={2} aria-hidden="true" />
          </g>
        );
      })}
    </svg>
  );
};

export default GardenPlan;
