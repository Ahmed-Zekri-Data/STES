import * as THREE from 'three';
import { PoolWorld, stoneTexture, canvasTexture } from './engine';
import { buildGarden } from './garden';
import { CAMERA_KEYS, keyOffsets, segmentAt, beatAt, lensLayout, smooth, CLEAN_WATER, TILES } from './story';

/*
 * The home page's 3D film, driven by the page's scroll position: the pool
 * seen from the sky, the goggles going on, the dive, the shop underwater,
 * back to the surface and the garden above the sea.
 *
 * React renders the page and the overlays; this draws the scene and moves
 * the overlays that change every frame (goggles picture, goggle display,
 * splash flash, story words), through the `dom` elements it is given.
 */

const SKY = { skyRot: -0.31, sunDir: [-0.5544, 0.742, 0.377], horizon: [0.4855, 0.504, 0.5618], top: [0.3948, 0.441, 0.5561] };
const HX = 6, HZ = 2.6, DEPTH = 1.5;

// The pool floor: lane lines, the STES drop, the name
const floorArt = () => {
  const w = 1024, h = Math.round(1024 * HZ / HX);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const x = canvas.getContext('2d');
  x.fillStyle = '#07384f';
  for (const lane of [0.3, 0.7]) {
    x.fillRect(w * 0.1, h * lane - h * 0.025, w * 0.8, h * 0.05);
    x.fillRect(w * 0.1, h * lane - h * 0.08, w * 0.012, h * 0.16);
    x.fillRect(w * 0.888, h * lane - h * 0.08, w * 0.012, h * 0.16);
  }
  x.save(); x.translate(w * 0.5, h * 0.5); x.scale(h / 260, h / 260);
  x.beginPath(); x.moveTo(0, -95); x.bezierCurveTo(40, -40, 70, -5, 70, 30); x.arc(0, 30, 70, 0, Math.PI); x.bezierCurveTo(-70, -5, -40, -40, 0, -95); x.fill();
  x.beginPath(); x.arc(0, 30, 50, Math.PI * 0.55, Math.PI * 0.95); x.lineWidth = 16; x.strokeStyle = '#e8fbff'; x.stroke();
  x.restore();
  x.font = `800 ${h * 0.13}px Unbounded, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('STES', w * 0.24, h * 0.5); x.fillText('.TN', w * 0.76, h * 0.5);
  return canvas;
};

class Particles {
  constructor(scene, count, material) {
    this.n = count;
    this.pos = new Float32Array(count * 3); this.vel = new Float32Array(count * 3);
    this.size = new Float32Array(count); this.alpha = new Float32Array(count); this.life = new Float32Array(count);
    this.i = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.points = new THREE.Points(g, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, size, life) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    this.size[i] = size; this.life[i] = life; this.alpha[i] = 1;
  }
  update(dt, step) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt; step(i, dt);
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = Math.min(1, this.life[i] * 3);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
  }
}

const POINT_VS = `attribute float size; attribute float alpha; uniform float uScale; uniform float uFade; varying float vA;
  void main(){ vec4 mv = viewMatrix * vec4(position, 1.0); vA = alpha * (uFade > 0.0 ? exp(-length(mv.xyz) * uFade) : 1.0);
    gl_PointSize = min(220.0, size * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`;

const GOGGLES_FS = `
  uniform sampler2D tScene; uniform vec2 uRes; uniform float uOn, uWet, uFog, uTime, uMode; uniform vec4 uLens;
  varying vec2 vUv;
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float grow() { float t = uOn; return mix(4.2, 1.0, t * t * (3.0 - 2.0 * t)); }
  // Signed distance to a goggle lens (screen-height units); side -1 left, +1 right, 0 single mask
  float lens(vec2 p, float side, out vec2 centre) {
    float k = grow();
    vec2 c = side == 0.0 ? vec2(0.0, uLens.y) : vec2(uLens.x * mix(2.3, 1.0, (4.2 - k) / 3.2) * side, uLens.y);
    centre = c;
    vec2 q = p - c; if (side < 0.0) q.x = -q.x;
    float rx = uLens.z * k;
    float ry = uLens.w * k * (side == 0.0 ? 1.0 : 0.8 + 0.2 * smoothstep(-rx, rx, q.x));
    q.y -= q.x * (side == 0.0 ? 0.0 : 0.07);
    float e = 2.6;
    return (pow(pow(abs(q.x) / rx, e) + pow(abs(q.y) / ry, e), 1.0 / e) - 1.0) * min(rx, ry);
  }
  vec3 sceneAt(vec2 uv) { return texture2D(tScene, clamp(uv, 0.001, 0.999)).rgb; }
  // Water drops running down the lens after surfacing
  vec3 drops(vec2 p) {
    vec3 acc = vec3(0.0);
    for (int layer = 0; layer < 2; layer++) {
      float sc = layer == 0 ? 6.0 : 11.0;
      vec2 g = p * sc;
      float colId = floor(g.x);
      g.y += uTime * (0.05 + 0.25 * hash12(vec2(colId, float(layer)))) * (layer == 0 ? 1.4 : 0.6);
      vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      if (hash12(id + float(layer) * 17.0) < 0.4) continue;
      vec2 pos = (vec2(hash12(id + 3.7), hash12(id + 9.1)) - 0.5) * 0.5;
      vec2 q = f - pos; q.y *= 1.25;
      float r = 0.1 + 0.2 * hash12(id + 5.3);
      float m = smoothstep(r, r * 0.65, length(q));
      acc.xy += q * m / sc; acc.z = max(acc.z, m);
    }
    return acc;
  }
  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    vec2 cL, cR, c;
    float d;
    if (uMode > 0.5) { d = lens(p, 0.0, c); }
    else { float dl = lens(p, -1.0, cL); float dr = lens(p, 1.0, cR); d = min(dl, dr); c = dl < dr ? cL : cR; }
    float k = grow();
    float frame = 0.028 * k;
    float edge = smoothstep(-0.16 * k, 0.0, d);
    vec2 dir = p - c;
    vec2 bend = dir * (-0.07 * edge * edge * uOn);
    vec2 uv = vUv + vec2(bend.x / aspect, bend.y);
    vec3 dp = uWet > 0.001 ? drops(p) : vec3(0.0);
    uv += vec2(dp.x / aspect, dp.y) * 1.6 * uWet;
    vec2 ca = vec2(dir.x / aspect, dir.y) * 0.012 * edge * edge * uOn;
    vec3 col = vec3(sceneAt(uv + ca).r, sceneAt(uv).g, sceneAt(uv - ca).b);
    if (uFog > 0.001) {
      vec3 blur = vec3(0.0);
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.785; blur += sceneAt(uv + vec2(cos(a), sin(a)) * 0.025); }
      col = mix(col, blur / 8.0 * 0.85 + 0.2, uFog * (0.45 + 0.55 * edge));
    }
    col = mix(col, col * 1.08 + 0.04, dp.z * uWet);
    col += vec3(1.0) * smoothstep(0.35, 0.95, dp.z) * 0.06 * uWet;
    col *= mix(vec3(1.0), vec3(0.95, 1.02, 1.05), uOn);
    col *= 1.0 - 0.28 * edge * uOn;
    col += smoothstep(0.02, 0.0, abs(dir.x * 0.55 + dir.y - uLens.w * 0.55 * k)) * 0.07 * uOn;
    if (d > 0.0) {
      if (d < frame) {
        float t = d / frame;
        vec3 rim = mix(vec3(0.06, 0.4, 0.48), vec3(0.01, 0.1, 0.14), t);
        rim += vec3(0.5, 0.95, 1.0) * pow(max(0.0, 1.0 - abs(t * 2.0 - 0.6)), 8.0) * 0.35;
        col = rim;
      } else {
        col = mix(vec3(0.003, 0.018, 0.026), sceneAt(vUv) * 0.1, 0.4);
      }
    }
    float vig = smoothstep(1.3, 0.3, length((vUv - 0.5) * vec2(aspect * 0.75, 1.0)));
    col *= mix(0.8, 1.0, vig);
    col += (hash12(vUv * uRes + fract(uTime * 7.0) * 311.0) - 0.5) * 0.028;
    gl_FragColor = vec4(col, 1.0);
  }`;

export const createPlongeeScene = async ({ canvas, dom, layout, isDark, quality, audio, reduceMotion, onFirstFrame, onBeat, afterFrame = () => {} }) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(quality.pixelRatio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 7000);

  await document.fonts?.load?.('800 40px Unbounded').catch(() => {});
  const world = new PoolWorld(renderer, {
    size: [HX, HZ], depth: DEPTH, rim: 0.03, simWidth: quality.simWidth, tile: 0.07,
    tileA: '#8fd8ea', tileB: '#5dbcd8', grout: '#d9f3f8', band: '#083f55',
    absorb: [0.34, 0.09, 0.07], deep: [0.01, 0.26, 0.38], caustics: 1.5, exposure: 1.35, fog: 2.4,
    skyTop: '#3a8fd8', skyHorizon: '#e6f0f2', art: floorArt()
  });
  const skyTexture = await new THREE.TextureLoader().loadAsync('/plongee/sky.jpg');
  world.useSkyImage(skyTexture, SKY);
  world.uniforms.uHills.value = 1;
  scene.add(world.group, world.sky(4000));

  // Travertine terrace around the pool, wider on the sunbathing side
  const deckOut = 1.6, terrace = 3.4;
  const stone = stoneTexture([216, 199, 170], 7);
  stone.texture.wrapS = stone.texture.wrapT = THREE.RepeatWrapping;
  const deck = world.lit({ map: stone.texture, worldUv: 0.42, recv: 1 });
  const coping = world.lit({ color: '#f3ede2', recv: 1 });
  const slab = (x0, x1, z0, z1, y0, y1, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    scene.add(m);
    return m;
  };
  const c = 0.3;
  slab(-HX - deckOut, -HX - c, -HZ - deckOut, HZ + terrace, -0.8, 0.04, deck); slab(HX + c, HX + deckOut, -HZ - deckOut, HZ + terrace, -0.8, 0.04, deck);
  slab(-HX - c, HX + c, HZ + c, HZ + terrace, -0.8, 0.04, deck); slab(-HX - c, HX + c, -HZ - deckOut, -HZ - c, -0.8, 0.04, deck);
  const garden = await buildGarden(world, scene, { hx: HX, hz: HZ, deckOut, terrace, quality: quality.grass, models: quality.models });
  // Edging stones on top of the walls, and the starting block
  slab(-HX - c, -HX, -HZ - c, HZ + c, 0.035, 0.07, coping); slab(HX, HX + c, -HZ - c, HZ + c, 0.035, 0.07, coping);
  slab(-HX, HX, HZ, HZ + c, 0.035, 0.07, coping); slab(-HX, HX, -HZ - c, -HZ, 0.035, 0.07, coping);
  slab(-HX - 0.75, -HX - 0.05, -0.35, 0.35, 0.07, 0.6, world.lit({ color: '#f4f6f6' }));
  slab(-HX - 0.77, -HX - 0.03, -0.37, 0.37, 0.6, 0.65, world.lit({ color: '#12b6cc' }));

  // LED projectors on the long walls
  const lampMat = world.lit({ color: '#dffcff', emissive: 1.4, emissiveColor: '#bff8ff' });
  const rimMat = world.lit({ color: '#9aa7ad' });
  const lamps = [[-2.2, -HZ], [2.2, -HZ], [-2.2, HZ], [2.2, HZ]].map(([x, z]) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), lampMat);
    m.position.set(x, -0.55, z + (z < 0 ? 0.004 : -0.004));
    m.rotation.y = z < 0 ? 0 : Math.PI;
    scene.add(m);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 32), rimMat);
    r.position.copy(m.position); r.rotation.copy(m.rotation);
    scene.add(r);
    return m;
  });
  world.uniforms.uLightPos.value = lamps.map(l => l.position.clone());

  // Robot cleaner on the floor
  const robot = new THREE.Group();
  const white = world.lit({ color: '#f2f6f7' }), aquaMat = world.lit({ color: '#12b6cc' }), graphite = world.lit({ color: '#1f282d' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4), white); body.position.y = 0.1; robot.add(body);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.46, 24, 1, false, 0, Math.PI), aquaMat);
  hood.rotation.set(0, Math.PI / 2, Math.PI / 2); hood.position.y = 0.18; hood.scale.set(1, 1, 0.45); robot.add(hood);
  for (const s of [-1, 1]) { const track = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.06), graphite); track.position.set(0, 0.05, s * 0.21); robot.add(track); }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 24, Math.PI), graphite); handle.position.y = 0.26; robot.add(handle);
  scene.add(robot);

  // Floating toys
  const ringStripes = canvasTexture(256, 32, (ctx, w, h) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6b5a'; ctx.fillRect(i * w / 8, 0, w / 8, h); } });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 20, 48), world.lit({ map: ringStripes.texture, poolGlow: 0 }));
  ring.rotation.x = Math.PI / 2; scene.add(ring);
  const ballStripes = canvasTexture(256, 64, (ctx, w, h) => { ['#ff5a4e', '#ffffff', '#2f7de1', '#ffd23f', '#ffffff', '#2ec27e'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * w / 6, 0, w / 6, h); }); });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), world.lit({ map: ballStripes.texture, poolGlow: 0 }));
  scene.add(ball);

  // Light shafts from the surface
  const shaftBase = new THREE.ShaderMaterial({
    uniforms: { uTime: world.uniforms.uTime, uUnder: world.uniforms.uUnder },
    vertexShader: 'varying vec2 vUv; varying float vDist; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vDist = length(w.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; uniform float uUnder; varying vec2 vUv; varying float vDist; uniform float uSeed;
      void main(){ float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
        float fall = pow(vUv.y, 1.6);
        float flick = 0.55 + 0.45 * sin(uTime * 0.8 + uSeed * 6.0) * sin(uTime * 0.53 + uSeed * 11.0);
        float a = edge * fall * flick * 0.06 * uUnder * exp(-vDist * 0.15) * smoothstep(1.2, 3.5, vDist);
        gl_FragColor = vec4(vec3(0.75, 0.97, 1.0) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const shafts = Array.from({ length: 26 }, () => {
    const mat = shaftBase.clone();
    mat.uniforms = { ...shaftBase.uniforms, uSeed: { value: Math.random() } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25 + Math.random() * 0.6, 1.7), mat);
    m.position.set((Math.random() * 2 - 1) * HX * 0.95, -0.78, (Math.random() * 2 - 1) * HZ * 0.9);
    scene.add(m);
    return m;
  });

  // Bubbles, spray, fireflies
  const pointScale = { value: 1 };
  const bubbles = new Particles(scene, quality.bubbles, new THREE.ShaderMaterial({
    uniforms: { uScale: pointScale, uFade: { value: 0.16 }, uUnder: world.uniforms.uUnder },
    vertexShader: POINT_VS,
    fragmentShader: `uniform float uUnder; varying float vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q); if (r > 0.5) discard;
        float ring = smoothstep(0.5, 0.42, r) * smoothstep(0.28, 0.45, r);
        float spec = smoothstep(0.13, 0.0, length(q - vec2(-0.15, -0.16)));
        float a = (ring * 0.85 + spec + 0.07) * vA * uUnder;
        gl_FragColor = vec4(vec3(0.86, 0.99, 1.0) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const vents = [[-3.8, 0.9], [-0.6, -1.2], [2.6, 0.5]];
  const foam = new Particles(scene, 500, new THREE.ShaderMaterial({
    uniforms: { uScale: pointScale, uFade: { value: 0 } },
    vertexShader: POINT_VS,
    fragmentShader: 'varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(vec3(0.95, 1.0, 1.0), smoothstep(0.5, 0.2, r) * vA * 0.9); }',
    transparent: true, depthWrite: false
  }));
  const fireflyGlow = { value: 0 };
  const fireflies = new Particles(scene, 70, new THREE.ShaderMaterial({
    uniforms: { uScale: pointScale, uFade: { value: 0 }, uGlow: fireflyGlow },
    vertexShader: POINT_VS,
    fragmentShader: 'uniform float uGlow; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; float a = smoothstep(0.5, 0.0, r) * vA * uGlow; gl_FragColor = vec4(vec3(1.0, 0.92, 0.55) * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const lawnSpot = () => {
    // Somewhere on the lawn, away from the terrace
    for (;;) {
      const x = -14 + Math.random() * 25, z = -10 + Math.random() * 20;
      if (!(x > -HX - 2 && x < HX + 2 && z > -HZ - 2 && z < HZ + 3.6)) return [x, z];
    }
  };
  for (let i = 0; i < 70; i++) { const [x, z] = lawnSpot(); fireflies.spawn(x, 0.3 + Math.random() * 1.3, z, 0, 0, 0, 0.035, 1e9); }

  const splashAt = (x, z, big) => {
    for (let i = 0; i < (big ? 360 : 120); i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * (big ? 0.5 : 0.3), out = 0.4 + Math.random() * (big ? 1.6 : 0.8);
      foam.spawn(x + Math.cos(a) * r, 0.02, z + Math.sin(a) * r, Math.cos(a) * out, (big ? 1.8 : 1.0) + Math.random() * (big ? 2.6 : 1.2), Math.sin(a) * out, 0.02 + Math.random() * 0.05, 1.6);
    }
    for (let i = 0; i < 6; i++) world.drop(x + (Math.random() - 0.5) * 0.8, z + (Math.random() - 0.5) * 0.8, 0.05, big ? 0.14 : 0.06);
  };
  const burstAround = (p, dir, n, spread = 0.9) => {
    for (let i = 0; i < n; i++) {
      const d = 0.25 + Math.random() * 1.6;
      bubbles.spawn(p.x + dir.x * d + (Math.random() - 0.5) * spread, Math.min(-0.05, p.y + dir.y * d + (Math.random() - 0.5) * spread * 0.6), p.z + dir.z * d + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 0.4, 0.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, 0.01 + Math.random() * 0.045, 5);
    }
  };

  // The goggles: the scene is drawn to a texture, then seen through the lenses
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  const goggles = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uOn: { value: 0 }, uWet: { value: 0 },
      uFog: { value: 0 }, uTime: world.uniforms.uTime, uMode: { value: 0 }, uLens: { value: new THREE.Vector4() }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: GOGGLES_FS,
    depthTest: false, depthWrite: false
  });
  const postScene = new THREE.Scene();
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), goggles);
  postQuad.frustumCulled = false;
  postScene.add(postQuad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---------------------------------------------------------------- the camera path
  const keys = CAMERA_KEYS.map(([, , pos, target_, up = [0, 1, 0]]) => {
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...pos), new THREE.Vector3(...target_), new THREE.Vector3(...up));
    return { pos: new THREE.Vector3(...pos), quat: new THREE.Quaternion().setFromRotationMatrix(m) };
  });
  let present = keys.map((_, index) => ({ index, offset: index }));
  let offsets = present.map(k => k.offset);
  let lens = lensLayout(1, 1);
  const measure = () => {
    present = keyOffsets(layout, window.innerHeight);
    offsets = present.map(k => k.offset);
  };

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight, pr = renderer.getPixelRatio();
    renderer.setSize(w, h, false);
    target.setSize(Math.round(w * pr), Math.round(h * pr));
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 72 : 50;
    camera.updateProjectionMatrix();
    goggles.uniforms.uRes.value.set(w, h);
    lens = lensLayout(w, h);
    goggles.uniforms.uMode.value = lens.mode;
    goggles.uniforms.uLens.value.set(lens.cx, lens.cy, lens.rx, lens.ry);
    pointScale.value = canvas.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    measure();
  };
  resize();

  // ---------------------------------------------------------------- pointer
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let lastBubble = 0;
  const ignored = (event) => event.target?.closest?.('a, button, input, nav, [role="dialog"]');
  const onMove = (event) => {
    ndc.set(event.clientX / window.innerWidth * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    if (camera.position.y > 0.2) { world.touch(ndc, camera, 0.02, 0.018); return; }
    const now = performance.now();
    if (now - lastBubble < 40) return;
    lastBubble = now;
    raycaster.setFromCamera(ndc, camera);
    const p = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(0.9 + Math.random() * 0.6));
    for (let i = 0; i < 2; i++) bubbles.spawn(p.x + (Math.random() - 0.5) * 0.06, Math.min(-0.05, p.y), p.z + (Math.random() - 0.5) * 0.06, 0, 0.3 + Math.random() * 0.4, 0, 0.006 + Math.random() * 0.012, 5);
    if (Math.random() < 0.15) audio.bloop();
  };
  const onDown = (event) => {
    if (ignored(event)) return;
    ndc.set(event.clientX / window.innerWidth * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    if (camera.position.y > 0.2) { world.touch(ndc, camera, 0.09, 0.03); return; }
    raycaster.setFromCamera(ndc, camera);
    burstAround(raycaster.ray.origin, raycaster.ray.direction, 40, 0.25);
    audio.bloop(300); audio.bloop(500);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------- the frame
  const fwd = new THREE.Vector3();
  const blue = new THREE.Vector3(0.35, 0.95, 1.0);
  const ledColor = new THREE.Color(), tileColor = new THREE.Color();
  let preview = null;
  const water = { t: 1, duration: 1, from: CLEAN_WATER, to: CLEAN_WATER };

  // Things the page puts labels on: equipment in the garden, and in the pool
  const anchorOf = {
    pump: () => garden.anchors.pump,
    filter: () => garden.anchors.filter,
    robot: () => robot.position.clone().add(new THREE.Vector3(0, 0.35, 0)),
    lights: () => lamps[1].position,
    ring: () => ring.position.clone().add(new THREE.Vector3(0, 0.15, 0))
  };
  const projected = new THREE.Vector3();
  const project = (key) => {
    const at = anchorOf[key]?.();
    if (!at) return null;
    projected.copy(at).project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
      inView: projected.z < 1 && Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.85,
      side: projected.x,
      distance: at.distanceTo(camera.position)
    };
  };
  let scrollSmooth = window.scrollY, wasUnder = false, splashT = -10, apnea = 0, fogT = -10, wasOn = false, wet = 0;
  let exhale = 2, clock = 0, robotT = 0, floatT = 0, introT = 0, introRun = false, beatKey = null;
  let last = performance.now(), first = true, frameId = 0, disposed = false;

  const frame = (now) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    scrollSmooth += (window.scrollY - scrollSmooth) * (reduceMotion ? 1 : Math.min(1, dt * 5));
    const y = scrollSmooth, vh = window.innerHeight;
    const seg = segmentAt(offsets, y);
    const from = keys[present[seg.from].index], to = keys[present[seg.to].index];
    camera.position.lerpVectors(from.pos, to.pos, seg.t);
    camera.quaternion.slerpQuaternions(from.quat, to.quat, seg.t);
    // Opening: from just above the water, spinning out to the whole garden
    if (introT < 1) {
      if (introRun) introT = Math.min(1, introT + dt / 3.8);
      const e = introT < 0.5 ? 4 * introT ** 3 : 1 - (-2 * introT + 2) ** 3 / 2;
      camera.position.set(0, THREE.MathUtils.lerp(1.3, keys[0].pos.y, e), 0.001);
      camera.quaternion.copy(keys[0].quat);
      camera.rotateZ((1 - e) * 1.6);
    }
    const under = camera.position.y < 0;
    if (under && !reduceMotion) { camera.position.y += Math.sin(now / 1400) * 0.02; camera.rotateZ(Math.sin(now / 2100) * 0.012); }
    camera.getWorldDirection(fwd);

    // Goggles: on as you scroll into the story, off when you surface
    const gogglesSection = layout('goggles') || { top: 0, height: 1 }, surface = layout('surface') || { top: 0, height: 1 };
    const gOn = smooth(0.12 * vh, gogglesSection.top + 0.3 * gogglesSection.height, y);
    const gOff = smooth(surface.top + 0.5 * surface.height, surface.top + 0.95 * surface.height, y);
    const on = gOn * (1 - gOff);
    goggles.uniforms.uOn.value = on;
    if (on > 0.97 && !wasOn) fogT = clock;
    wasOn = on > 0.97;
    goggles.uniforms.uFog.value = on > 0.5 ? Math.max(0, Math.exp(-(clock - fogT) * 1.1) * 0.9) : 0;
    const flying = gOn < 1 ? gOn : 1 - gOff;
    dom.gog.style.transform = `translate(-50%, -50%) translateY(${THREE.MathUtils.lerp(vh * 0.75, vh * 0.5, flying)}px) scale(${1 + Math.pow(flying, 2.2) * 9})`;
    dom.gog.style.opacity = introT < 1 ? '0' : gOn < 1 ? String(1 - smooth(0.55, 0.85, flying)) : '0';

    // Breaking the surface
    if (under !== wasUnder) {
      splashT = clock;
      if (under) {
        splashAt(camera.position.x + fwd.x * 0.6, camera.position.z + fwd.z * 0.6, true);
        burstAround(camera.position, fwd, 260, 1.2);
        audio.splash(true);
      } else {
        splashAt(camera.position.x, camera.position.z, false);
        wet = 1; apnea = 0;
        audio.splash(false);
      }
      wasUnder = under;
    }
    dom.flash.style.opacity = String(Math.max(0, Math.exp(-(clock - splashT) * 5)) * 0.75);
    wet = Math.max(0, wet - dt * 0.12);
    goggles.uniforms.uWet.value = under ? 0 : wet * on;

    // Breathing out now and then; the pool's own bubbles
    if (under && !reduceMotion) {
      apnea += dt; exhale -= dt;
      if (exhale < 0) {
        exhale = 3.5 + Math.random() * 3;
        for (let i = 0; i < 14; i++) bubbles.spawn(camera.position.x + fwd.x * 0.35 + (Math.random() - 0.5) * 0.12, camera.position.y - 0.18, camera.position.z + fwd.z * 0.35 + (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.1, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.1, 0.012 + Math.random() * 0.03, 4);
        audio.bloop(260);
      }
      if (Math.random() < dt * 1.5) audio.bloop();
    }
    if (!reduceMotion && Math.random() < dt * 30) {
      const [vx, vz] = vents[Math.floor(Math.random() * vents.length)];
      bubbles.spawn(vx + (Math.random() - 0.5) * 0.25, -DEPTH + 0.02, vz + (Math.random() - 0.5) * 0.25, 0, 0.25 + Math.random() * 0.3, 0, 0.008 + Math.random() * 0.02, 8);
    }
    bubbles.update(dt, (i) => {
      bubbles.vel[i * 3 + 1] = Math.min(1.1, bubbles.vel[i * 3 + 1] + dt * 0.5);
      bubbles.vel[i * 3] = Math.sin(clock * 3 + i) * 0.06;
      bubbles.vel[i * 3 + 2] = Math.cos(clock * 2.6 + i) * 0.06;
      if (bubbles.pos[i * 3 + 1] > -0.03) bubbles.life[i] = 0;
    });
    foam.update(dt, (i) => {
      foam.vel[i * 3 + 1] -= 9.8 * dt;
      if (foam.pos[i * 3 + 1] < 0 && foam.vel[i * 3 + 1] < 0) {
        foam.life[i] = 0;
        if (Math.random() < 0.08) world.drop(foam.pos[i * 3], foam.pos[i * 3 + 2], 0.012, 0.01);
      }
    });

    // Night: dark mode is the night view
    const night = isDark() || Boolean(preview?.night);
    world.uniforms.uNight.value += ((night ? 0.92 : 0) - world.uniforms.uNight.value) * Math.min(1, dt * 1.8);
    const led = preview && preview.led !== undefined ? preview.led : [blue.x, blue.y, blue.z];
    if (led === 'rgb') ledColor.setHSL((clock * 0.08) % 1, 0.8, 0.6);
    else ledColor.setRGB(...(led || [0, 0, 0]));
    world.uniforms.uLightCol.value.lerp(new THREE.Vector3(ledColor.r, ledColor.g, ledColor.b), Math.min(1, dt * 3));
    const tile = preview?.tile || TILES[0];
    for (const [key, uniform] of [['a', 'uTileA'], ['b', 'uTileB'], ['band', 'uBand']]) world.uniforms[uniform].value.lerp(tileColor.set(tile[key]), Math.min(1, dt * 4));
    // The diagnostic's water
    if (water.t < 1) {
      water.t = Math.min(1, water.t + dt / water.duration);
      const e = water.t * water.t * (3 - 2 * water.t);
      const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * e);
      world.uniforms.uDeep.value.fromArray(mix(water.from.deep, water.to.deep));
      world.uniforms.uAbsorb.value.fromArray(mix(water.from.absorb, water.to.absorb));
      world.uniforms.uDirt.value = water.from.dirt + (water.to.dirt - water.from.dirt) * e;
    }
    fireflyGlow.value = smooth(0.6, 0.9, world.uniforms.uNight.value) * (under ? 0 : 1);
    fireflies.update(dt, (i) => {
      fireflies.vel[i * 3] = Math.sin(clock * 0.7 + i * 1.3) * 0.25;
      fireflies.vel[i * 3 + 1] = Math.cos(clock * 0.9 + i * 2.1) * 0.12;
      fireflies.vel[i * 3 + 2] = Math.sin(clock * 0.5 + i * 0.7) * 0.25;
    });
    for (let i = 0; i < fireflies.n; i++) fireflies.alpha[i] = 0.25 + 0.75 * Math.max(0, Math.sin(clock * 1.7 + i * 2.3));

    // Robot at work, toys afloat
    robotT += reduceMotion ? 0 : dt;
    robot.position.set(1.3 + Math.sin(robotT * 0.25) * 1.1, -DEPTH, -0.2 + Math.sin(robotT * 0.13) * 0.5);
    robot.rotation.y = Math.cos(robotT * 0.25) > 0 ? 0 : Math.PI;
    world.uniforms.uRobot.value.set(robot.position.x, -DEPTH + 0.11, robot.position.z, 0.25);
    floatT += reduceMotion ? 0 : dt;
    ring.position.set(1.8 + Math.sin(floatT * 0.05) * 1.6, Math.sin(floatT * 1.3) * 0.012 - 0.01, 0.9 + Math.cos(floatT * 0.04) * 0.7);
    ring.rotation.z = floatT * 0.05;
    ball.position.set(4.2 + Math.cos(floatT * 0.06) * 1.1, 0.08 + Math.sin(floatT * 1.6 + 1) * 0.012, -0.8 + Math.sin(floatT * 0.05) * 0.8);
    ball.rotation.set(floatT * 0.3, floatT * 0.2, 0);
    world.uniforms.uFloat.value[0].set(ring.position.x, ring.position.z, 0.34, 1);
    world.uniforms.uFloat.value[1].set(ball.position.x, ball.position.z, 0.2, 2);
    if (!reduceMotion && Math.random() < dt * 3) { world.drop(ring.position.x + 0.45, ring.position.z, 0.02, 0.004); world.drop(ball.position.x, ball.position.z, 0.02, 0.005); }

    // Story words
    const current = introT < 1 ? null : beatAt(layout, y);
    const key = current ? current.beat.section + current.beat.from : null;
    if (key !== beatKey) { beatKey = key; onBeat(current?.beat || null); }
    dom.beat.style.opacity = current ? String(current.opacity) : '0';
    const inner = dom.beat.firstElementChild;
    if (current && inner) {
      const { kind } = current.beat, t = current.t;
      inner.style.transform = kind === 'count' ? `scale(${1.25 - t * 0.35})` : kind === 'go' ? `scale(${0.8 + t * 0.6})` : `translateY(${(0.5 - t) * 40}px)`;
    }

    // The goggle display: on while wearing them, faint behind the shop's content
    const hudOn = on > 0.95 && goggles.uniforms.uFog.value < 0.35;
    const reading = ['boutique', 'produits'].some(name => { const s = layout(name); return s && y > s.top - vh * 0.6 && y < s.top + s.height - vh * 0.4; });
    dom.hudL.style.opacity = dom.hudR.style.opacity = hudOn ? (reading ? '0.25' : '1') : '0';
    const w = window.innerWidth;
    if (lens.mode === 0) {
      const inset = w / 2 - lens.cx * vh - lens.rx * vh * 0.62;
      dom.hudL.style.left = `${inset}px`; dom.hudR.style.right = `${inset}px`;
      dom.hudL.style.top = dom.hudR.style.top = `${vh / 2 - lens.ry * vh * 0.66}px`;
    } else {
      dom.hudL.style.left = '24px'; dom.hudR.style.right = '24px';
      dom.hudL.style.top = dom.hudR.style.top = `${vh * 0.14}px`;
    }
    dom.depth.textContent = `${(Math.max(0, -camera.position.y) * 1.25).toFixed(2).replace('.', ',')} m`;
    dom.apnea.textContent = `00:${String(Math.min(59, Math.floor(apnea))).padStart(2, '0')}`;
    dom.air.style.width = `${Math.max(8, 100 - apnea * 2.2)}%`;

    afterFrame({ project, under, goggles: on, y });
    world.uniforms.uExposure.value = THREE.MathUtils.lerp(world.uniforms.uExposure.value, under ? 0.95 : 1.35, Math.min(1, dt * 3));
    audio.update(under, night, dt);
    for (const s of shafts) { s.lookAt(camera.position.x, s.position.y, camera.position.z); s.rotateX(-0.12); }
    world.update(reduceMotion ? 0 : dt, camera, { idleDrops: !reduceMotion });

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
    if (first) { first = false; onFirstFrame(); }
    frameId = requestAnimationFrame(frame);
  };

  world.update(0.016, camera, { idleDrops: false });
  renderer.compile(scene, camera);
  renderer.compile(postScene, postCam);
  frameId = requestAnimationFrame(frame);

  return {
    measure,
    // The opening's drop lands on the mosaic drop: ripples, then the pull-out
    impact() {
      introRun = true;
      world.drop(0, 0, 0.05, 0.35);
      setTimeout(() => world.drop(0, 0, 0.02, -0.2), 120);
      splashAt(0, 0, false);
      audio.splash(false);
    },
    skipIntro() { introT = 1; },
    // Diagnostic: show a water problem (or clean water, null), over `duration` s
    setWater(look, duration = 1.2) {
      water.from = { deep: world.uniforms.uDeep.value.toArray(), absorb: world.uniforms.uAbsorb.value.toArray(), dirt: world.uniforms.uDirt.value };
      water.to = look || CLEAN_WATER;
      water.t = 0;
      water.duration = duration;
    },
    // Configurator: { tile, led, night } while choosing, null afterwards
    setPreview(next) { preview = next; },
    get introDone() { return introT >= 1; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        object.geometry?.dispose();
        for (const material of [].concat(object.material || [])) {
          for (const value of Object.values(material.uniforms || {})) value?.value?.isTexture && value.value.dispose();
          material.map?.dispose();
          material.dispose();
        }
      });
      world.dispose();
      skyTexture.dispose();
      target.dispose();
      goggles.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
};

