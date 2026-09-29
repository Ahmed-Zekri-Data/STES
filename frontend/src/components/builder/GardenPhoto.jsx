import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw } from 'lucide-react';
import { quadMatrix, cornerRadius, metres } from './plan';

const BOX = 400; // the pool is drawn in a box this wide, then put in perspective

// A starting spot: a trapezoid in the lower middle, like a pool seen from a terrace
const defaultCorners = (w, h) => [[w * 0.3, h * 0.55], [w * 0.7, h * 0.55], [w * 0.82, h * 0.82], [w * 0.18, h * 0.82]];

// The visitor's garden photo with their pool laid on it: drag the four
// corners onto the ground where the pool would go. The photo stays in the
// browser; nothing is uploaded.
const GardenPhoto = ({ pool }) => {
  const [photo, setPhoto] = useState(null);
  const [corners, setCorners] = useState(null);
  const stage = useRef(null);
  const dragging = useRef(null);
  const input = useRef(null);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const load = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPhoto(URL.createObjectURL(file));
    setCorners(null);
  };

  const onImage = () => {
    const box = stage.current.getBoundingClientRect();
    setCorners(defaultCorners(box.width, box.height));
  };

  const at = (event) => {
    const box = stage.current.getBoundingClientRect();
    return [Math.min(box.width, Math.max(0, event.clientX - box.left)), Math.min(box.height, Math.max(0, event.clientY - box.top))];
  };
  const down = (index) => (event) => { event.preventDefault(); stage.current.setPointerCapture(event.pointerId); dragging.current = index; };
  const move = (event) => {
    if (dragging.current === null) return;
    const p = at(event);
    setCorners(current => current.map((c, i) => (i === dragging.current ? p : c)));
  };
  const up = () => { dragging.current = null; };
  const nudge = (index) => (event) => {
    const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[event.key];
    if (!d) return;
    event.preventDefault();
    setCorners(current => current.map((c, i) => (i === index ? [c[0] + d[0], c[1] + d[1]] : c)));
  };

  const height = BOX * (pool.width / pool.length);
  const radius = (cornerRadius(pool) / pool.length) * BOX;
  const matrix = corners && quadMatrix(BOX, height, corners);

  if (!photo) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-3xl border-2 border-dashed border-gray-300 bg-surface/60 p-8 text-center">
        <div className="max-w-sm">
          <ImagePlus className="mx-auto h-10 w-10 text-blue-600" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-bold text-gray-900">Voyez-la dans votre jardin</h3>
          <p className="mt-2 text-gray-600">Prenez une photo de l’endroit prévu, puis placez la piscine dessus. La photo reste sur votre appareil : elle n’est envoyée nulle part.</p>
          <button type="button" className="btn-brand mt-6" onClick={() => input.current.click()}>Choisir une photo</button>
          <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" onChange={load} aria-label="Photo de votre jardin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div ref={stage} className="relative overflow-hidden rounded-3xl bg-gray-900 touch-none select-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <img src={photo} alt="Votre jardin" className="block w-full" onLoad={onImage} draggable={false} />
        {matrix && (
          <>
            <div
              className="pointer-events-none absolute left-0 top-0 origin-top-left"
              style={{ width: BOX, height, transform: `matrix3d(${matrix.join(',')})` }}
              aria-hidden="true"
            >
              <div
                className="h-full w-full"
                style={{
                  borderRadius: radius,
                  border: '10px solid #efe7d8',
                  boxShadow: '0 0 0 14px rgb(227 213 187 / 0.9), inset 0 12px 30px rgb(0 40 60 / 0.45)',
                  background: 'url(/plongee/caustics.png) 0 0 / 160px 160px, linear-gradient(160deg, #6fdcee, #139bbd 55%, #065b7a)'
                }}
              />
            </div>
            {corners.map(([x, y], i) => (
              <button
                key={i}
                type="button"
                className="absolute -ml-4 -mt-4 h-8 w-8 cursor-move rounded-full border-2 border-white bg-blue-600/80 shadow-lg"
                style={{ left: x, top: y }}
                onPointerDown={down(i)}
                onKeyDown={nudge(i)}
                aria-label={`Coin ${i + 1} de la piscine : glisser ou utiliser les flèches`}
              />
            ))}
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
        <p>Glissez les 4 coins sur le sol, là où serait la piscine ({metres(pool.length)} × {metres(pool.width)}).</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={onImage}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Recentrer</button>
          <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={() => input.current.click()}>Autre photo</button>
          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={load} aria-label="Autre photo de votre jardin" />
        </div>
      </div>
    </div>
  );
};

export default GardenPhoto;
