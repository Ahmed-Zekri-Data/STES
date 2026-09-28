// The garden around the home page's pool: a mown lawn with real grass blades, olive
// trees, palms, hedges, a Sidi Bou Said villa, a sun terrace. Everything is
// lit by the same sun and sky as the water (engine.js).
import * as THREE from 'three';
import { LIGHT_COMMON as COMMON, canvasTexture, palmTree } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ASSETS = '/plongee/';
const textureLoader = new THREE.TextureLoader();
// Photographed textures, used as they are (the shaders expect display colours)
const photoTexture = (file, repeat = true) => {
  const t = textureLoader.load(ASSETS + 'textures/' + file);
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
};
const gltfLoader = new GLTFLoader();
// A downloaded model, re-dressed with the scene's own lighting, scaled to a height
const loadModel = async (world, id, height, { alphaTest = 0, recv = 0 } = {}) => {
  const gltf = await gltfLoader.loadAsync(`${ASSETS}models/${id}/${id}.gltf`);
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const map = o.material.map || null;
    if (map) map.colorSpace = THREE.NoColorSpace;
    const leaves = /leaf|leaves/i.test(o.material.name + o.name);
    o.material = world.lit({ map, color: o.material.color ? '#' + o.material.color.getHexString() : '#ffffff', alphaTest: leaves ? 0.5 : alphaTest, side: leaves ? THREE.DoubleSide : THREE.FrontSide, recv, sway: leaves ? 0.3 : 0 });
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(height / size.y);
  box.setFromObject(root);
  root.position.y -= box.min.y;
  const wrap = new THREE.Group();
  wrap.add(root);
  return wrap;
};

const WORLD_VS = /* glsl */`
varying vec3 vWorld;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

// Lawn seen from afar: colour variation, mowing stripes, dry patches
const LAWN_FS = /* glsl */`
${COMMON}
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz;
  float n1 = fbm(p * 0.3), n2 = fbm(p * 2.1 + 7.0), n3 = vnoise(p * 18.0), n4 = vnoise(p * 55.0);
  vec3 col = mix(vec3(0.11, 0.24, 0.06), vec3(0.22, 0.40, 0.10), smoothstep(0.25, 0.7, n1));
  col = mix(col, vec3(0.34, 0.50, 0.15), smoothstep(0.55, 0.9, n2) * 0.45);
  col *= 0.82 + 0.22 * n3 + 0.12 * n4;
  float stripe = smoothstep(0.46, 0.54, abs(fract(p.x / 2.6) - 0.5) * 2.0);
  col *= mix(0.9, 1.1, stripe);
  col = mix(col, vec3(0.46, 0.46, 0.22), smoothstep(0.74, 0.88, fbm(p * 0.55 + 13.0)) * 0.3);
  float sunAmt = sunAmount();
  float diff = max(uSunDir.y, 0.0);
  vec3 light = skyAmbient() * 0.85 + sunColor() * diff * 0.95 * sunAmt;
  light -= sunColor() * diff * 0.8 * sunAmt * casterShade(vWorld);
  vec2 q = max(abs(vWorld.xz) - uPool.xz, 0.0);
  light += uLightCol * lampAmount() * 0.35 / (1.0 + dot(q, q) * 1.2);
  col = hazeTo(col * light, vWorld, 16.0);
  gl_FragColor = vec4(finish(col), 1.0);
}`;

// One grass blade per instance, bending in the wind
const GRASS_VS = /* glsl */`
attribute vec3 aOffset; attribute vec4 aParams;
uniform float uTime;
varying vec3 vWorld; varying float vH; varying float vSeed;
void main() {
  vec3 p = position;
  float y = p.y;
  p.y *= aParams.x;
  float gust = sin(uTime * 0.7 + aOffset.x * 0.15) * 0.5 + 0.5;
  float wind = (sin(uTime * 2.1 + aOffset.x * 0.9 + aOffset.z * 0.6) * 0.6 + sin(uTime * 3.7 + aOffset.z * 2.1) * 0.25) * (0.4 + gust);
  p.z += (aParams.z + wind * 0.45) * y * y * aParams.x;
  float c = cos(aParams.y), s = sin(aParams.y);
  p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  vec3 w = aOffset + p;
  vWorld = w; vH = y; vSeed = aParams.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;
const GRASS_FS = /* glsl */`
${COMMON}
varying vec3 vWorld; varying float vH; varying float vSeed;
void main() {
  vec3 base = vec3(0.05, 0.13, 0.03);
  vec3 tip = mix(vec3(0.36, 0.56, 0.16), vec3(0.55, 0.62, 0.24), vSeed * vSeed);
  vec3 col = mix(base, tip, smoothstep(0.0, 1.0, vH));
  col *= 0.8 + 0.35 * vSeed;
  float sunAmt = sunAmount();
  float shade = casterShade(vWorld);
  vec3 light = skyAmbient() * (0.35 + 0.65 * vH) + sunColor() * (0.55 + 0.45 * vH) * 0.95 * sunAmt * (1.0 - shade * 0.85);
  light += sunColor() * pow(vH, 2.0) * 0.18 * sunAmt * (1.0 - shade);
  vec2 q = max(abs(vWorld.xz) - uPool.xz, 0.0);
  light += uLightCol * lampAmount() * 0.35 / (1.0 + dot(q, q) * 1.2);
  col = hazeTo(col * light, vWorld, 16.0);
  gl_FragColor = vec4(finish(col), 1.0);
}`;

// Leafy volumes: olive crowns, hedges, bougainvillea
const FOLIAGE_VS = /* glsl */`
uniform float uTime; uniform float uBump; uniform float uSway;
varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vec3 p = position;
  float d = sin(p.x * 9.0 + p.y * 7.0) * 0.5 + sin(p.z * 11.0 + p.x * 5.0) * 0.35 + sin(p.y * 17.0 + p.z * 13.0) * 0.15;
  p += normal * d * uBump;
  vec4 w = modelMatrix * vec4(p, 1.0);
  w.xz += vec2(sin(uTime * 1.3 + w.y * 1.7 + w.x), cos(uTime * 1.1 + w.z)) * 0.015 * uSway * max(w.y, 0.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FOLIAGE_FS = /* glsl */`
${COMMON}
uniform vec3 uColA, uColB, uFlower; uniform float uCut, uFlowerAmt, uLeafScale;
varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float leaf = vnoise(vWorld.xz * uLeafScale + vWorld.y * uLeafScale * 0.8) * 0.65 + vnoise(vWorld.zy * uLeafScale * 2.1) * 0.35;
  float rim = 1.0 - abs(dot(n, V));
  if (leaf < rim * uCut) discard;
  vec3 col = mix(uColA, uColB, smoothstep(0.2, 0.9, leaf));
  if (uFlowerAmt > 0.0) col = mix(col, uFlower * (0.8 + 0.4 * leaf), step(1.0 - uFlowerAmt, vnoise(vWorld.xy * 24.0 + vWorld.z * 21.0)));
  float sunAmt = sunAmount();
  float wrap = max(dot(n, uSunDir) * 0.6 + 0.4, 0.0);
  float ao = 0.45 + 0.55 * clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 light = skyAmbient() * ao + sunColor() * wrap * 0.85 * sunAmt * (0.55 + 0.45 * leaf);
  vec2 q = max(abs(vWorld.xz) - uPool.xz, 0.0);
  light += uLightCol * lampAmount() * 0.4 / (1.0 + dot(q, q) * 0.8);
  col = hazeTo(col * light, vWorld, 16.0);
  gl_FragColor = vec4(finish(col), 1.0);
}`;

const foliage = (world, { a, b, flower = '#000000', flowerAmt = 0, cut = 0.55, bump = 0.12, sway = 1, leafScale = 16 }) => new THREE.ShaderMaterial({
  uniforms: {
    ...world.uniforms,
    uColA: { value: new THREE.Color(a) }, uColB: { value: new THREE.Color(b) }, uFlower: { value: new THREE.Color(flower) },
    uFlowerAmt: { value: flowerAmt }, uCut: { value: cut }, uBump: { value: bump }, uSway: { value: sway }, uLeafScale: { value: leafScale }
  },
  vertexShader: FOLIAGE_VS, fragmentShader: FOLIAGE_FS
});

// Lime-washed wall, slightly uneven
const limeTexture = () => canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) {
    const v = 225 + Math.random() * 30;
    ctx.fillStyle = `rgba(${v},${v - 3},${v - 10},0.25)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 2 + Math.random() * 6);
  }
});

export const buildGarden = async (world, scene, { hx, hz, deckOut, terrace, quality = 1, models = true }) => {
  const anchors = {};
  const casters = [];
  const cast = (x, z, radius, height) => casters.push([x, z, radius, height]);
  const add = (mesh) => { scene.add(mesh); return mesh; };

  // ---- the lawn, with a hole where the terrace is
  const EDGE = { west: -17, east: 20.5, z: 12.5 };
  const shape = new THREE.Shape();
  shape.moveTo(EDGE.west, -EDGE.z); shape.lineTo(EDGE.east, -EDGE.z); shape.lineTo(EDGE.east, EDGE.z); shape.lineTo(EDGE.west, EDGE.z); shape.lineTo(EDGE.west, -EDGE.z);
  const hole = new THREE.Path();
  const [x0, x1, z0, z1] = [-hx - deckOut, hx + deckOut, -hz - deckOut, hz + terrace];
  hole.moveTo(x0, -z1); hole.lineTo(x1, -z1); hole.lineTo(x1, -z0); hole.lineTo(x0, -z0); hole.lineTo(x0, -z1);
  shape.holes.push(hole);
  const lawnGeo = new THREE.ShapeGeometry(shape);
  lawnGeo.rotateX(-Math.PI / 2);
  add(new THREE.Mesh(lawnGeo, new THREE.ShaderMaterial({ uniforms: world.uniforms, vertexShader: WORLD_VS, fragmentShader: LAWN_FS })));

  // ---- where things stand (no grass there)
  const villaX = 11.5;
  const keepOut = [
    (x, z) => x > x0 - 0.05 && x < x1 + 0.05 && z > z0 - 0.05 && z < z1 + 0.05,
    (x) => x > villaX - 0.3,
    (x, z) => Math.abs(z) < 0.45 && x > x1 && x < villaX,           // stepping stones
    (x, z) => Math.abs(z) > 11.1 || x < -16.6,                       // hedges and railing
    (x, z) => Math.hypot(x + 11.2, z - 5.6) < 1.1                     // equipment cabinet
  ];

  // ---- grass blades
  const count = Math.round(170000 * quality);
  const blade = new THREE.InstancedBufferGeometry();
  const w = 0.018;
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.6, 0.45, 0, w * 0.6, 0.45, 0, 0, 1, 0], 3));
  blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  const offsets = new Float32Array(count * 3), params = new Float32Array(count * 4);
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 4) {
    tries++;
    // More blades near the pool, where the camera goes
    const r = Math.random();
    const x = r < 0.7 ? (Math.random() * 2 - 1) * 13 : (Math.random() * 2 - 1) * 16;
    const z = r < 0.7 ? (Math.random() * 2 - 1) * 9 : (Math.random() * 2 - 1) * 11;
    if (keepOut.some(f => f(x, z))) continue;
    offsets.set([x, 0, z], placed * 3);
    params.set([0.07 + Math.random() * 0.1, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.6, Math.random()], placed * 4);
    placed++;
  }
  blade.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets.subarray(0, placed * 3), 3));
  blade.setAttribute('aParams', new THREE.InstancedBufferAttribute(params.subarray(0, placed * 4), 4));
  blade.instanceCount = placed;
  const grass = new THREE.Mesh(blade, new THREE.ShaderMaterial({ uniforms: world.uniforms, vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide }));
  grass.frustumCulled = false;
  add(grass);

  // ---- hedges around the garden
  const hedgeMat = foliage(world, { a: '#123a12', b: '#2f6120', cut: 0.3, bump: 0.05, sway: 0.2, leafScale: 22 });
  const hedge = (xA, xB, zA, zB) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(xB - xA, 1.2, zB - zA, Math.ceil((xB - xA) * 4), 6, Math.ceil((zB - zA) * 4)), hedgeMat);
    m.position.set((xA + xB) / 2, 0.6, (zA + zB) / 2);
    add(m);
  };
  const lowHedge = (xA, xB, zA, zB) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(xB - xA, 0.8, zB - zA, Math.ceil((xB - xA) * 4), 4, Math.ceil((zB - zA) * 4)), hedgeMat);
    m.position.set((xA + xB) / 2, 0.4, (zA + zB) / 2);
    add(m);
  };
  lowHedge(-14.5, villaX - 0.5, -12.2, -11.4); lowHedge(-14.5, villaX - 0.5, 11.4, 12.2);
  void hedge;

  // Glass railing along the cliff, facing the sea
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const railMat = world.lit({ color: '#2b3236' });
  for (let z = -12; z < 12; z += 2) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.0), glassMat);
    pane.rotation.y = Math.PI / 2; pane.position.set(EDGE.west + 0.25, 0.55, z + 1); add(pane);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), railMat); post.position.set(EDGE.west + 0.25, 0.55, z); add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 24.2), railMat); rail.position.set(EDGE.west + 0.25, 1.08, 0); add(rail);

  // The cliff: sandstone walls dropping to the sea, with wild shrubs on the edge
  const rock = world.lit({ map: photoTexture('large_sandstone_blocks_01_diff_1k.jpg'), worldUv: 0.22, color: '#e6d6bd' });
  const cliff = (x0c, x1c, z0c, z1c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1c - x0c, 26, z1c - z0c), rock);
    m.position.set((x0c + x1c) / 2, -13, (z0c + z1c) / 2); add(m);
  };
  cliff(EDGE.west - 0.6, EDGE.west, -EDGE.z - 0.6, EDGE.z + 0.6); cliff(EDGE.east, EDGE.east + 0.6, -EDGE.z - 0.6, EDGE.z + 0.6);
  cliff(EDGE.west, EDGE.east, -EDGE.z - 0.6, -EDGE.z); cliff(EDGE.west, EDGE.east, EDGE.z, EDGE.z + 0.6);
  const maquis = foliage(world, { a: '#1d3a17', b: '#556b36', cut: 0.55, bump: 0.14, sway: 0.4, leafScale: 16 });
  for (let x = EDGE.west + 1; x < EDGE.east; x += 2.3) {
    for (const zs of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.5, 3), maquis);
      m.position.set(x + Math.random(), 0.2, zs * (EDGE.z - 0.1)); m.scale.y = 0.7; add(m);
    }
  }
  scene.add(world.sea(-24, 9000, [0, 0]));

  // ---- olive trees: twisted trunks, silvery crowns
  const bark = canvasTexture(64, 256, (ctx, cw, ch) => {
    ctx.fillStyle = '#6f6356'; ctx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 90; i++) { ctx.strokeStyle = `rgba(${40 + Math.random() * 40},${35 + Math.random() * 30},${30 + Math.random() * 20},0.6)`; ctx.lineWidth = 1 + Math.random() * 3; ctx.beginPath(); const x = Math.random() * cw; ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 10, ch / 3, x - 10, ch * 0.66, x + 5, ch); ctx.stroke(); }
  });
  const barkMat = world.lit({ map: bark.texture });
  const oliveMat = foliage(world, { a: '#3d4a33', b: '#8a9a78', cut: 0.62, bump: 0.16, sway: 1, leafScale: 14 });
  const olive = (x, z, s = 1) => {
    const g = new THREE.Group();
    const pts = [[0, 0, 0], [0.15, 0.6, 0.05], [-0.1, 1.2, 0.1], [0.2, 1.8, -0.05]].map(([a, b, c]) => new THREE.Vector3(a, b, c).multiplyScalar(s));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.16 * s, 8), barkMat));
    for (const [bx, bz] of [[0.7, 0.3], [-0.6, 0.4], [0.1, -0.7]]) {
      const b = new THREE.CatmullRomCurve3([new THREE.Vector3(0.15, 1.5, 0), new THREE.Vector3(bx * 0.6, 2.0, bz * 0.6), new THREE.Vector3(bx, 2.4, bz)].map(v => v.multiplyScalar(s)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(b, 10, 0.06 * s, 6), barkMat));
    }
    const crowns = [[0, 2.7, 0, 1.2], [0.9, 2.4, 0.3, 0.9], [-0.8, 2.5, 0.4, 0.95], [0.2, 2.5, -0.9, 0.9], [-0.3, 3.2, -0.2, 0.8], [0.6, 3.0, -0.4, 0.7]];
    for (const [cx, cy, cz, r] of crowns) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 4), oliveMat);
      m.position.set(cx * s, cy * s, cz * s); m.scale.y = 0.75; g.add(m);
    }
    g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI * 2;
    add(g); cast(x, z, 1.9 * s, 2.7 * s);
  };
  olive(-11.5, -6.5, 1.1); olive(-12.8, 4.5, 1.25); olive(-5.5, 8.2, 0.9); olive(7.5, -8.2, 1.0); olive(-6, -8.6, 0.85);

  // ---- palms
  for (const [x, z, h, rot] of [[9.2, 6.8, 4.6, 2.4], [-9.5, -8.8, 5.0, 0.6], [9.6, -5.6, 4.0, 3.6]]) {
    const p = palmTree(world, { height: h, lean: 0.7, seed: x, fronds: 13 });
    p.position.set(x, 0, z); p.rotation.y = rot; add(p);
    cast(x + Math.sin(rot) * 0.5, z + Math.cos(rot) * 0.5, 1.6, h);
  }

  // ---- the villa, Sidi Bou Said style: white walls, blue door and shutters, bougainvillea
  const lime = limeTexture();
  lime.texture.wrapS = lime.texture.wrapT = THREE.RepeatWrapping;
  const wallMat = world.lit({ map: lime.texture, worldUv: 0.5, recv: 1 });
  const blue = world.lit({ color: '#1e63b0' });
  const dark = world.lit({ color: '#1b2226' });
  const villa = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 16), wallMat);
  villa.position.set(villaX + 4, 1.8, 0); add(villa);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.3, 16.2), wallMat); parapet.position.set(villaX + 4, 3.75, 0); add(parapet);
  // Arched blue door, centred on the pool
  const arch = new THREE.Shape();
  arch.moveTo(-0.7, 0); arch.lineTo(0.7, 0); arch.lineTo(0.7, 1.9); arch.absarc(0, 1.9, 0.7, 0, Math.PI, false); arch.lineTo(-0.7, 0);
  const archGeo = new THREE.ExtrudeGeometry(arch, { depth: 0.08, bevelEnabled: false });
  const surround = new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.04, bevelEnabled: false }), world.lit({ color: '#e9f0f7' }));
  surround.scale.set(1.18, 1.1, 1); surround.rotation.y = -Math.PI / 2; surround.position.set(villaX - 0.02, 0, 0); add(surround);
  const door = new THREE.Mesh(archGeo, blue); door.rotation.y = -Math.PI / 2; door.position.set(villaX - 0.06, 0, 0); add(door);
  for (let i = 0; i < 14; i++) { const stud = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), dark); stud.position.set(villaX - 0.08, 0.3 + (i % 7) * 0.3, i < 7 ? -0.35 : 0.35); add(stud); }
  // Windows with blue shutters and the typical grille
  const grille = canvasTexture(128, 128, (ctx, cw, ch) => { ctx.fillStyle = '#1b2226'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = '#1e63b0'; ctx.lineWidth = 7; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * cw / 4, 0); ctx.lineTo(i * cw / 4, ch); ctx.stroke(); ctx.beginPath(); ctx.arc(cw / 2, ch * 0.2, cw * 0.18 * i / 2, 0, Math.PI * 2); ctx.stroke(); } });
  for (const z of [-4.2, 4.2]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), world.lit({ map: grille.texture }));
    win.rotation.y = -Math.PI / 2; win.position.set(villaX - 0.03, 1.7, z); add(win);
    for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.6), blue); sh.position.set(villaX - 0.05, 1.7, z + s * 0.92); add(sh); }
  }
  // Bougainvillea pouring over the wall
  const bougain = foliage(world, { a: '#244f1c', b: '#3f7a2a', flower: '#e0317e', flowerAmt: 0.55, cut: 0.6, bump: 0.14, sway: 0.6, leafScale: 18 });
  for (const [z, y, r] of [[-6.6, 2.6, 1.0], [-5.8, 3.4, 0.9], [-7.2, 1.4, 0.8], [2.1, 3.5, 0.75], [1.4, 2.9, 0.55], [6.4, 2.4, 1.05], [7.0, 1.3, 0.8], [5.6, 3.5, 0.8]]) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 4), bougain);
    m.position.set(villaX - 0.3, y, z); m.scale.set(0.55, 1, 1); add(m);
  }
  // Terracotta pots by the door
  const clayPot = models ? await loadModel(world, 'planter_pot_clay', 0.62) : new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.6, 20).translate(0, 0.3, 0), world.lit({ color: '#b5623c', recv: 1 }));
  for (const z of [-1.4, 1.4]) {
    const pot = clayPot.clone(); pot.position.set(villaX - 0.6, 0, z); add(pot);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 3), foliage(world, { a: '#1f4a18', b: '#4c8a32', cut: 0.5, bump: 0.08, leafScale: 20 }));
    bush.position.set(villaX - 0.6, 0.85, z); add(bush);
    cast(villaX - 0.6, z, 0.5, 1.1);
  }

  // ---- stepping stones from the terrace to the door
  const stoneMat = world.lit({ color: '#d9ccb4', recv: 1 });
  for (let x = x1 + 0.7; x < villaX - 0.6; x += 0.85) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 20), stoneMat);
    s.position.set(x, 0.02, (Math.random() - 0.5) * 0.12); s.scale.x = 0.9 + Math.random() * 0.2; add(s);
  }

  // ---- sun terrace: teak loungers with thick cushions, a parasol, side tables
  const teak = world.lit({ map: photoTexture('brown_planks_05_diff_1k.jpg'), worldUv: 1.6, color: '#d9a36a', recv: 1 });
  const steel = world.lit({ color: '#9aa4a8' });
  const weave = canvasTexture(128, 128, (ctx, cw, ch) => {
    ctx.fillStyle = '#efe9df'; ctx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < cw; i += 2) { ctx.fillStyle = `rgba(120,110,95,${0.05 + Math.random() * 0.05})`; ctx.fillRect(i, 0, 1, ch); ctx.fillRect(0, i, cw, 1); }
  });
  weave.texture.wrapS = weave.texture.wrapT = THREE.RepeatWrapping;
  const fabric = world.lit({ map: weave.texture, worldUv: 3, recv: 1 });
  const towelTex = canvasTexture(64, 128, (ctx, cw, ch) => { ctx.fillStyle = '#14aac0'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#f4f1ea'; for (const y of [0.15, 0.2, 0.8, 0.85]) ctx.fillRect(0, y * ch, cw, ch * 0.03); });
  const towelMat = world.lit({ map: towelTex.texture });
  const pillow = models ? await loadModel(world, 'throw_pillows_01', 0.28) : new THREE.Group();
  const lounger = (x, z, ry) => {
    const g = new THREE.Group();
    for (const sx of [-0.31, 0.31]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 1.98), teak); r.position.set(sx, 0.3, 0); g.add(r); }
    for (let i = 0; i < 12; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.022, 0.07), teak); sl.position.set(0, 0.35, -0.2 + i * 0.1); g.add(sl); }
    for (const [lx, lz] of [[-0.31, 0.9], [0.31, 0.9], [-0.31, -0.9], [0.31, -0.9]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), teak); leg.position.set(lx, 0.15, lz); g.add(leg); }
    for (const sx of [-0.34, 0.34]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16), steel); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.07, -0.92); g.add(wh); }
    // Backrest, raised on its hinge
    const back = new THREE.Group(); back.position.set(0, 0.36, -0.25); back.rotation.x = 0.72;
    for (let i = 0; i < 7; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.022, 0.07), teak); sl.position.set(0, 0, -0.05 - i * 0.1); back.add(sl); }
    const backPad = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.075, 0.72, 4, 0.03), fabric); backPad.position.set(0, 0.05, -0.36); back.add(backPad);
    const pil = pillow.clone(); pil.position.set(0, 0.1, -0.62); pil.rotation.x = -0.2; back.add(pil);
    g.add(back);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.085, 1.24, 4, 0.035), fabric); seat.position.set(0, 0.405, 0.38); g.add(seat);
    const towel = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.035, 0.42, 2, 0.012), towelMat); towel.position.set(0, 0.46, 0.72); g.add(towel);
    g.position.set(x, 0.04, z); g.rotation.y = ry; add(g);
    cast(x, z, 0.8, 0.5);
    return g;
  };
  const tz = hz + terrace * 0.62;
  for (const lx of [-3.3, -2.1, 1.7, 2.9]) lounger(lx, tz, Math.PI);
  anchors.lounger = new THREE.Vector3(-2.1, 0.7, tz);

  // Side tables (downloaded model) between the pairs
  const table = models ? await loadModel(world, 'round_wooden_table_02', 0.48, { recv: 1 }) : new THREE.Group();
  for (const tx of [-2.7, 2.3]) { const t = table.clone(); t.scale.multiplyScalar(0.55); t.position.set(tx, 0.04, tz - 0.55); add(t); cast(tx, tz - 0.55, 0.4, 0.48); }
  anchors.table = new THREE.Vector3(2.3, 0.6, tz - 0.55);

  // Parasol: octagonal canopy on ribs, heavy base
  const canvasTex = canvasTexture(256, 64, (ctx, cw, ch) => { ctx.fillStyle = '#f3ede1'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#1e63b0'; ctx.fillRect(0, ch * 0.86, cw, ch * 0.14); ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < 8; i++) ctx.fillRect(i * cw / 8, 0, 2, ch); });
  const parasol = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 24), world.lit({ color: '#3a4145' })); base.position.y = 0.08; parasol.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.45, 10), teak); pole.position.y = 1.3; parasol.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.52, 8, 1, true), world.lit({ map: canvasTex.texture, side: THREE.DoubleSide }));
  canopy.position.y = 2.32; parasol.add(canopy);
  const valance = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 8, 1, true), world.lit({ color: '#1e63b0', side: THREE.DoubleSide }));
  valance.position.y = 2.0; parasol.add(valance);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.62, 5), steel);
    rib.position.set(Math.cos(a) * 0.78, 2.3, Math.sin(a) * 0.78); rib.rotation.set(0, -a, Math.PI / 2 - 0.32); parasol.add(rib);
  }
  parasol.position.set(-0.2, 0.04, tz); add(parasol);
  cast(-0.2, tz, 1.65, 2.3);
  anchors.parasol = new THREE.Vector3(-0.2, 2.45, tz);

  // Potted plants at the terrace corners (downloaded model)
  const plant = models ? await loadModel(world, 'potted_plant_02', 1.1) : new THREE.Group();
  for (const [px, pz] of [[-hx - 1.1, hz + terrace - 0.5], [hx + 1.1, hz + terrace - 0.5], [-hx - 1.1, -hz - 1.1]]) { const p = plant.clone(); p.position.set(px, 0.04, pz); add(p); cast(px, pz, 0.5, 1.1); }
  anchors.plant = new THREE.Vector3(hx + 1.1, 1.0, hz + terrace - 0.5);

  // Equipment cabinet by the sea: pump (AstralPool style) and sand filter
  const cab = new THREE.Group();
  const cabW = 1.5, cabH = 1.05, cabD = 0.9;
  const panel = (w2, h2, d2, x2, y2, z2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), teak); m.position.set(x2, y2, z2); cab.add(m); };
  panel(cabW, 0.05, cabD, 0, cabH, 0); panel(cabW, 0.05, cabD, 0, 0.03, 0); panel(0.05, cabH, cabD, -cabW / 2, cabH / 2, 0); panel(0.05, cabH, cabD, cabW / 2, cabH / 2, 0); panel(cabW, cabH, 0.04, 0, cabH / 2, -cabD / 2);
  const cabDoor = new THREE.Mesh(new THREE.BoxGeometry(0.74, cabH - 0.1, 0.04), teak); cabDoor.position.set(cabW / 2 + 0.2, cabH / 2, cabD / 2 + 0.33); cabDoor.rotation.y = -1.2; cab.add(cabDoor);
  const black = world.lit({ color: '#1b1e20' });
  const pump = new THREE.Group();
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24), black); motor.rotation.z = Math.PI / 2; motor.position.set(-0.12, 0.2, 0); pump.add(motor);
  for (let i = 0; i < 6; i++) { const fin = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.006, 6, 24), black); fin.rotation.y = Math.PI / 2; fin.position.set(-0.24 + i * 0.045, 0.2, 0); pump.add(fin); }
  const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24), black); volute.rotation.z = Math.PI / 2; volute.position.set(0.09, 0.2, 0); pump.add(volute);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 24), black); basket.position.set(0.24, 0.24, 0); pump.add(basket);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24), new THREE.MeshBasicMaterial({ color: 0xbfe6f0, transparent: true, opacity: 0.55 })); lid.position.set(0.24, 0.37, 0); pump.add(lid);
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.001), world.lit({ color: '#e8f1f8', emissive: 0.2, emissiveColor: '#1e63b0' })); label.position.set(0.09, 0.22, 0.131); pump.add(label);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22), black); foot.position.set(0.02, 0.07, 0); pump.add(foot);
  pump.position.set(-0.35, 0.05, 0.1); cab.add(pump);
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 6, 24), world.lit({ color: '#2a3033' })); tank.position.set(0.38, 0.45, 0); cab.add(tank);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 20), world.lit({ color: '#dfe6ea' })); valve.position.set(0.38, 0.86, 0); cab.add(valve);
  const pipeMat = world.lit({ color: '#d9dde0' });
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.11, 0.37, 0.1), new THREE.Vector3(-0.1, 0.62, 0.1), new THREE.Vector3(0.3, 0.9, 0.05)]), 16, 0.022, 8), pipeMat); cab.add(pipe);
  cab.position.set(-11.2, 0.0, 5.6); cab.rotation.y = 0.5; add(cab); cab.updateMatrixWorld(true);
  cast(-11.2, 5.6, 0.9, 1.0);
  anchors.pump = cab.localToWorld(new THREE.Vector3(-0.3, 0.5, 0.2));
  anchors.filter = cab.localToWorld(new THREE.Vector3(0.38, 0.95, 0));
  anchors.cabinet = cab.position.clone();

  // Garden lamps: lanterns by the villa door, bollards along the path and terrace
  const LAMPS = [[villaX - 0.35, 2.2, -0.95], [villaX - 0.35, 2.2, 0.95], [x1 + 1.2, 0.45, 0.7], [x1 + 3.6, 0.45, -0.7], [-hx - 1.2, 0.45, hz + terrace - 0.9], [hx + 1.2, 0.45, -hz - 1.1]];
  const glassLamp = new THREE.ShaderMaterial({
    uniforms: world.uniforms,
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uNight; void main() { float on = smoothstep(0.45, 0.9, uNight); gl_FragColor = vec4(mix(vec3(0.85, 0.82, 0.74), vec3(1.0, 0.8, 0.5) * 2.2, on), 1.0); }'
  });
  const lampBody = world.lit({ color: '#2b3236' });
  LAMPS.forEach(([lx, ly, lz], i) => {
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), glassLamp);
    bulb.position.set(lx, ly, lz); add(bulb);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), lampBody); cap.position.set(lx, ly + 0.095, lz); add(cap);
    if (ly < 1) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, ly - 0.08, 0.08), lampBody); post.position.set(lx, (ly - 0.08) / 2, lz); add(post); }
    world.uniforms.uGardenLamps.value[i].set(lx, ly, lz);
  });

  // Hand the shadows to the shaders
  world.uniforms.uCasterCount.value = Math.min(16, casters.length);
  casters.slice(0, 16).forEach((c, i) => world.uniforms.uCasters.value[i].set(...c));
  return { villaX, anchors, edge: EDGE };
};
