// The home page's story as data: where the camera is at each point of the
// page, which words appear, and the goggles' lens shapes. No three.js here,
// so it can be tested on its own.

export const clamp01 = (value) => Math.min(1, Math.max(0, value));

// 0 → 1 between a and b, eased at both ends
export const smooth = (a, b, value) => {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Sections of the page, in order (their ids are `pl-<name>`)
export const SECTIONS = ['hero', 'goggles', 'ready', 'dive', 'boutique', 'robot', 'produits', 'up', 'surface', 'garden', 'installation', 'contact'];
export const sectionId = (name) => `pl-${name}`;

// Camera: [section, how far into it (0–1, or 'end' for the section's
// bottom reaching the bottom of the screen), position, target, up]
export const CAMERA_KEYS = [
  ['hero', 0, [0, 17, 0.01], [0, 0, 0], [0, 0, -1]],
  ['goggles', 0.2, [-4.6, 4.6, 2.6], [-4, 0, 0]],
  ['ready', 0.02, [-7.05, 1.72, 0], [6, 0.9, 0]],
  ['ready', 0.9, [-6.85, 1.62, 0], [-2.6, -1, 0]],
  ['dive', 0.3, [-5.7, 2.35, 0], [-3.5, -0.3, 0]],
  ['dive', 0.62, [-4.4, -0.45, 0], [-2.2, -1.4, 0]],
  ['boutique', 0.02, [-3.2, -0.8, 0.5], [1, -0.7, 0]],
  ['robot', 0.35, [0.1, -1.05, 1.05], [1.3, -1.4, -0.2]],
  ['produits', 0.02, [0.8, -0.8, -0.9], [4.5, -0.6, 0.5]],
  ['up', 0.4, [3.6, -1.2, 0.2], [4.6, 1.6, -0.2]],
  ['surface', 0.3, [4.7, -0.35, 0], [6.5, 0.45, 0.2]],
  ['surface', 0.85, [5.2, 1.7, 1.8], [-6, -0.2, 0.5]],
  ['garden', 0.12, [8.6, 3.5, 9.8], [-2.5, 0, 2.6]],
  ['garden', 0.72, [-6.9, 2.3, 9.8], [-11.2, 0.4, 5.6]],
  ['installation', 0.1, [-13.5, 6, 1.5], [3, -0.8, -0.5]],
  ['contact', 'end', [10.5, 2.7, 3.2], [-30, -3, -2]]
];

// Scroll position (px) of each camera key, from the sections' layout:
// `layout(name)` gives { top, height } in px
export const keyOffsets = (layout, viewport) => CAMERA_KEYS.map(([name, at]) => {
  const { top, height } = layout(name);
  return at === 'end' ? top + height - viewport : top + at * height;
});

// Which two keys the scroll position is between, and how far (eased)
export const segmentAt = (offsets, y) => {
  let i = 0;
  while (i < offsets.length - 2 && y > offsets[i + 1]) i++;
  const span = offsets[i + 1] - offsets[i];
  const t = span > 0 ? clamp01((y - offsets[i]) / span) : 1;
  return { from: i, to: i + 1, t: t * t * (3 - 2 * t) };
};

// Words shown in the middle of the screen at moments of the story
export const BEATS = [
  { section: 'goggles', from: 0.25, to: 0.95, kind: 'title', kicker: 'Anti-buée · Vision HD · Affichage intelligent', title: 'Lunettes', accent: 'ajustées.' },
  { section: 'ready', from: 0, to: 0.33, kind: 'count', text: '3' },
  { section: 'ready', from: 0.33, to: 0.66, kind: 'count', text: '2' },
  { section: 'ready', from: 0.66, to: 0.98, kind: 'count', text: '1' },
  { section: 'dive', from: 0, to: 0.45, kind: 'go', text: 'Plongez !' },
  { section: 'robot', from: 0.08, to: 0.58, kind: 'low', kicker: 'Robot nettoyeur · en action', title: 'Vous nagez,', accent: 'il nettoie.' },
  { section: 'up', from: 0.1, to: 0.85, kind: 'title', kicker: 'La fenêtre de Snell', title: 'Regardez', accent: 'vers le haut.' },
  { section: 'surface', from: 0.55, to: 1, kind: 'title', kicker: 'De retour à la surface', title: 'Bienvenue', accent: 'au jardin.' },
  { section: 'garden', from: 0, to: 0.8, kind: 'corner', kicker: 'Installation et entretien', title: 'Votre piscine,', accent: 'votre jardin.' }
];

// The beat showing at scroll position y, with its progress (0–1) and opacity
export const beatAt = (layout, y) => {
  for (const beat of BEATS) {
    const { top, height } = layout(beat.section);
    const t = ((y - top) / height - beat.from) / (beat.to - beat.from);
    if (t >= 0 && t <= 1) return { beat, t, opacity: smooth(0, 0.18, t) * (1 - smooth(0.82, 1, t)) };
  }
  return null;
};

// One-line help at the bottom of the screen, by section
export const HINTS = {
  goggles: 'Continuez : le plongeon arrive',
  boutique: 'Bougez la souris : vos mains font des bulles',
  robot: 'Touchez l’eau pour faire des bulles',
  surface: 'De retour à l’air libre',
  garden: 'Les meilleurs équipements pour votre piscine',
  installation: 'Un projet ? Nos techniciens se déplacent',
  contact: ''
};

// Steps of the dive map (clickable)
export const MAP_STEPS = [
  ['hero', 'Accueil'], ['ready', 'Le plongeon'], ['boutique', 'Boutique'], ['produits', 'Favoris'],
  ['garden', 'Le jardin'], ['installation', 'Installation'], ['contact', 'Contact']
];

// Goggle lenses in screen-height units: two lenses on wide screens, one
// diving mask on tall ones
export const lensLayout = (width, height) => {
  const aspect = width / height;
  if (aspect < 1.05) return { mode: 1, cx: 0, cy: 0, rx: Math.min(0.47 * aspect, 0.5), ry: 0.42 };
  const s = Math.min(1, aspect / 1.82);
  return { mode: 0, cx: 0.46 * s, cy: 0.02, rx: 0.43 * s, ry: 0.36 * s + (1 - s) * 0.05 };
};

// Lighter settings for phones and small screens
export const qualityFor = ({ width, pixelRatio = 1, memory = 8 }) => {
  const small = width < 800 || memory <= 4;
  return {
    small,
    pixelRatio: Math.min(pixelRatio, small ? 1.25 : 1.5),
    grass: small ? 0.25 : 1,
    simWidth: small ? 256 : 384,
    models: !small,
    bubbles: small ? 450 : 900
  };
};
