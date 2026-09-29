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
export const SECTIONS = ['hero', 'goggles', 'ready', 'dive', 'boutique', 'robot', 'produits', 'up', 'surface', 'garden', 'diagnostic', 'config', 'packs', 'avis', 'installation', 'contact'];
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
  ['diagnostic', 0.12, [-4.2, 3.6, -6.2], [1.2, -1, 0.2]],
  ['config', 0.06, [-10.4, 3.3, 5.4], [2.5, -0.4, 0]],
  ['packs', 0.06, [6.5, 2.5, 3.2], [-30, -4, -5]],
  ['avis', 0.1, [-1.5, 10, 15], [-1.5, 0, 0]],
  ['installation', 0.1, [-13.5, 6, 1.5], [3, -0.8, -0.5]],
  ['contact', 'end', [10.5, 2.7, 3.2], [-30, -3, -2]]
];

// The camera keys of the sections on the page, with their scroll position
// (px): `layout(name)` gives { top, height } in px, or null when the
// section is not shown (nothing chosen for it in the admin)
export const keyOffsets = (layout, viewport) => CAMERA_KEYS.flatMap(([name, at], index) => {
  const box = layout(name);
  if (!box) return [];
  return [{ index, offset: at === 'end' ? box.top + box.height - viewport : box.top + at * box.height }];
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
  { section: 'garden', from: 0, to: 0.8, kind: 'corner', kicker: 'Le jardin STES', title: 'Votre piscine,', accent: 'votre jardin.' }
];

// The beat showing at scroll position y, with its progress (0–1) and opacity
export const beatAt = (layout, y) => {
  for (const beat of BEATS) {
    const box = layout(beat.section);
    if (!box) continue;
    const { top, height } = box;
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
  garden: 'Cliquez sur les + : l’équipement que vous voyez est en boutique',
  diagnostic: 'Choisissez un problème : la piscine vous le montre',
  config: 'Chaque choix change la piscine en direct',
  packs: 'Tout le nécessaire de la saison, en un seul produit',
  avis: 'Des piscines STES partout en Tunisie',
  installation: 'Un projet ? Nos techniciens se déplacent',
  contact: ''
};

// Steps of the dive map (clickable)
export const MAP_STEPS = [
  ['hero', 'Accueil'], ['ready', 'Le plongeon'], ['boutique', 'Boutique'], ['produits', 'Favoris'],
  ['garden', 'Le jardin'], ['diagnostic', 'Diagnostic'], ['config', 'Configurateur'], ['packs', 'Packs'],
  ['avis', 'Avis'], ['installation', 'Installation'], ['contact', 'Contact']
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

// Water problems the diagnostic can show: water colour and murk, dirt on
// the floor; "cold" also shows the temperature rising once fixed
export const PROBLEMS = {
  green: { label: 'Eau verte', title: 'Des algues se développent', cause: 'Le chlore est trop bas et la chaleur fait le reste. Avec le bon traitement, l’eau redevient claire en 48 h.', water: { deep: [0.07, 0.3, 0.07], absorb: [0.6, 0.12, 0.55], dirt: 0.25 } },
  cloudy: { label: 'Eau trouble', title: 'La filtration ne suit plus', cause: 'De fines particules restent en suspension. Un floculant et un média filtrant propre règlent le problème.', water: { deep: [0.36, 0.44, 0.46], absorb: [1.4, 1.2, 1.1], dirt: 0 } },
  dirty: { label: 'Fond sale', title: 'Feuilles et dépôts au fond', cause: 'Un robot nettoie le fond et les parois tout seul, pendant que vous profitez.', water: { deep: [0.03, 0.24, 0.3], absorb: [0.42, 0.14, 0.11], dirt: 1 } },
  cold: { label: 'Eau trop froide', title: 'Baignade trop courte', cause: 'Une pompe à chaleur gagne plusieurs degrés et des mois de baignade.', water: { deep: [0, 0.14, 0.34], absorb: [0.4, 0.12, 0.05], dirt: 0 }, temperature: [19, 28] }
};
export const CLEAN_WATER = { deep: [0.01, 0.26, 0.38], absorb: [0.34, 0.09, 0.07], dirt: 0 };

// Configurator previews: mosaic colours and LED light colours
export const TILES = [
  { name: 'Lagon', a: '#8fd8ea', b: '#5dbcd8', band: '#083f55' },
  { name: 'Sable', a: '#efe3c6', b: '#dccaa2', band: '#8a7350' },
  { name: 'Bleu profond', a: '#4f8fc8', b: '#2f6aa6', band: '#0b2748' },
  { name: 'Anthracite', a: '#7b898f', b: '#5f6c72', band: '#1f2629' }
];
export const LEDS = [
  { name: 'Sans', color: null },
  { name: 'Blanc', color: [1, 0.95, 0.85] },
  { name: 'Bleu', color: [0.3, 0.8, 1] },
  { name: 'Multicolore', color: 'rgb' }
];

// Governorate capitals (longitude, latitude), for the map of orders
export const GOVERNORATES = [
  ['Tunis', 10.18, 36.8], ['Ariana', 10.19, 36.86], ['Ben Arous', 10.23, 36.75], ['Manouba', 10.1, 36.81],
  ['Nabeul', 10.73, 36.45], ['Zaghouan', 10.14, 36.4], ['Bizerte', 9.87, 37.27], ['Béja', 9.18, 36.73],
  ['Jendouba', 8.78, 36.5], ['Le Kef', 8.71, 36.17], ['Siliana', 9.37, 36.08], ['Sousse', 10.64, 35.83],
  ['Monastir', 10.83, 35.78], ['Mahdia', 11.06, 35.5], ['Sfax', 10.76, 34.74], ['Kairouan', 10.1, 35.68],
  ['Kasserine', 8.84, 35.17], ['Sidi Bouzid', 9.48, 35.04], ['Gabès', 10.1, 33.88], ['Médenine', 10.5, 33.35],
  ['Tataouine', 10.45, 32.93], ['Gafsa', 8.78, 34.43], ['Tozeur', 8.13, 33.92], ['Kébili', 8.97, 33.7]
];
// Spellings vary ("Gabes", "Medenine", "Kef"): compare without accents or "Le"
const plain = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^le\s+/, '').trim();
export const governorateOf = (name) => GOVERNORATES.find(([label]) => plain(label) === plain(name)) || null;

// "1 290 TND"
export const tnd = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;
