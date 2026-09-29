import React, { useEffect, useRef, useState } from 'react';

const DROP = 'M60 6C80 36 108 64 108 94a48 48 0 0 1-96 0C12 64 40 36 60 6z';

/*
 * The opening: the STES drop fills with water while the 3D loads, then
 * "Marhba" and the welcome, then the drop falls into the pool (onImpact).
 * `short`: returning visitors and less motion get only the loader.
 */
const Intro = ({ ready, short, onImpact, onSkip }) => {
  const [phase, setPhase] = useState('load'); // load → hello → out → drop → done
  const [level, setLevel] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const water = useRef(null);
  const ripple = useRef(null);
  const turbulence = useRef(null);
  const readyRef = useRef(ready);
  const done = useRef(false);
  readyRef.current = ready;

  const finish = (impact) => {
    if (done.current) return;
    done.current = true;
    setPhase('done');
    if (impact) onImpact(); else onSkip();
  };

  // The water rising in the drop, with a wavy surface
  useEffect(() => {
    let frame, current = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      const target = readyRef.current ? 1 : Math.min(0.88, t / 3.2);
      current += (target - current) * 0.07;
      if (readyRef.current && current > 0.994) current = 1;
      const y = 152 - current * 158;
      let d = `M-5 160 L-5 ${y.toFixed(1)}`;
      for (let x = -5; x <= 125; x += 5) d += ` L${x} ${(y + Math.sin(x / 13 + t * 4.2) * 3.2 * (1 - current * 0.6)).toFixed(1)}`;
      water.current?.setAttribute('d', `${d} L125 160 Z`);
      setLevel(Math.round(current * 100));
      if (current === 1 && t > 1.2) return;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Returning visitors: gone as soon as the pool is ready
  useEffect(() => { if (short && ready) finish(false); }, [short, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once full: the welcome
  useEffect(() => {
    if (!short && level >= 100 && phase === 'load') setPhase('hello');
  }, [level, phase, short]);

  // Then the drop: started once with the welcome, and only cancelled if
  // the page closes (not when the phase moves on to "out" and "drop")
  const sequence = useRef([]);
  useEffect(() => {
    if (phase !== 'hello' || sequence.current.length) return;
    sequence.current = [
      setTimeout(() => setPhase('out'), 4000),
      setTimeout(() => setPhase('drop'), 4400),
      setTimeout(() => finish(true), 5200)
    ];
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => sequence.current.forEach(clearTimeout), []);

  // "Marhba" settles as if the water calms
  useEffect(() => {
    if (phase !== 'hello') return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      const k = Math.max(0, 1 - t / 2.2);
      ripple.current?.setAttribute('scale', (6 + 38 * k * k).toFixed(1));
      turbulence.current?.setAttribute('baseFrequency', `${0.012 + Math.sin(t * 2) * 0.003} ${0.05 + Math.cos(t * 1.6) * 0.01}`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const skip = () => {
    if (readyRef.current) finish(false);
    else setWaiting(true);
  };
  useEffect(() => { if (waiting && ready) finish(false); }, [waiting, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done') return null;
  const hello = phase === 'hello' || phase === 'out';

  return (
    <div className={`pl-intro${phase === 'drop' ? ' pl-intro--gone' : ''}`} role="dialog" aria-label="Bienvenue chez STES">
      <svg width="0" height="0" className="pl-sr" aria-hidden="true">
        <filter id="pl-ripple" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence ref={turbulence} type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="3" />
          <feDisplacementMap ref={ripple} in="SourceGraphic" scale="40" />
        </filter>
      </svg>
      <div className="pl-intro__caustics" aria-hidden="true" />
      <div className={`pl-loader${phase !== 'load' ? ' pl-loader--out' : ''}`}>
        <svg viewBox="0 0 120 150" aria-hidden="true">
          <defs>
            <clipPath id="pl-drop-clip"><path d={DROP} /></clipPath>
            <linearGradient id="pl-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b8fbff" /><stop offset=".5" stopColor="#33d2ea" /><stop offset="1" stopColor="#0a6f96" />
            </linearGradient>
          </defs>
          <g clipPath="url(#pl-drop-clip)"><path ref={water} fill="url(#pl-water)" /></g>
          <path d={DROP} fill="none" stroke="rgba(159,244,251,.55)" strokeWidth="2.5" />
          <path d="M40 104a22 22 0 0 0 22 22" stroke="#fff" strokeOpacity=".8" strokeWidth="6" strokeLinecap="round" fill="none" />
        </svg>
        <p className="pl-mono" role="status">
          {waiting ? 'Encore un instant…' : <>Remplissage du bassin · <b>{level}</b> %</>}
        </p>
      </div>
      {!short && <div className={`pl-hello${hello ? ' pl-hello--show' : ''}${phase === 'out' ? ' pl-hello--out' : ''}`} aria-hidden={!hello}>
        <p className="pl-hello__ar" lang="ar" dir="rtl"><span>مرحبا</span></p>
        <h2>Marhba.</h2>
        <p className="pl-hello__lead">Bienvenue chez <b>STES</b> : les meilleurs équipements pour la piscine de vos rêves, en Tunisie.</p>
        <p className="pl-mono pl-hello__breath">Retenez votre souffle…</p>
      </div>}
      <div className={`pl-intro__drop${phase === 'drop' ? ' pl-intro__drop--fall' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 120 150"><path d={DROP} fill="url(#pl-water)" /><path d="M40 104a22 22 0 0 0 22 22" stroke="#fff" strokeOpacity=".8" strokeWidth="7" strokeLinecap="round" fill="none" /></svg>
      </div>
      <button type="button" className="pl-skip" onClick={skip}>Passer l’intro</button>
    </div>
  );
};

export default Intro;
