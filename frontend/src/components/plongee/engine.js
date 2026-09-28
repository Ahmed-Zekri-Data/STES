// STES pool engine: a real-time swimming pool, used by the home page.
// - The water surface is a height field simulated on the GPU (waves spread,
//   bounce off the walls and fade), so touching it makes real ripples.
// - The pool is drawn by following light rays: through the moving surface
//   (refraction), onto the tiles, with sunlight caustics and absorption.
// - Day to night: sky, sun, sea and underwater lights follow one value.
import * as THREE from 'three';

const QUAD_VS = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const UPDATE_FS = /* glsl */`
uniform sampler2D uTex; uniform vec2 uDelta; uniform float uDamping;
varying vec2 vUv;
void main() {
  vec4 info = texture2D(uTex, vUv);
  vec2 dx = vec2(uDelta.x, 0.0), dy = vec2(0.0, uDelta.y);
  float avg = (texture2D(uTex, vUv - dx).r + texture2D(uTex, vUv + dx).r +
               texture2D(uTex, vUv - dy).r + texture2D(uTex, vUv + dy).r) * 0.25;
  info.g += (avg - info.r) * 2.0;
  info.g *= uDamping;
  info.r += info.g;
  info.r *= 0.9995;
  gl_FragColor = info;
}`;

const DROP_FS = /* glsl */`
uniform sampler2D uTex; uniform vec2 uCenter; uniform float uRadius, uStrength, uAspect;
varying vec2 vUv;
void main() {
  vec4 info = texture2D(uTex, vUv);
  float d = max(0.0, 1.0 - length((uCenter - vUv) * vec2(uAspect, 1.0)) / uRadius);
  d = 0.5 - cos(d * 3.14159265) * 0.5;
  info.r += d * uStrength;
  gl_FragColor = info;
}`;

export class WaterSim {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    const opts = {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false
    };
    this.targets = [new THREE.WebGLRenderTarget(width, height, opts), new THREE.WebGLRenderTarget(width, height, opts)];
    this.delta = new THREE.Vector2(1 / width, 1 / height);
    this.aspect = width / height;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.updateMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null }, uDelta: { value: this.delta }, uDamping: { value: 0.994 } },
      vertexShader: QUAD_VS, fragmentShader: UPDATE_FS
    });
    this.dropMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: null }, uCenter: { value: new THREE.Vector2() },
        uRadius: { value: 0.03 }, uStrength: { value: 0.01 }, uAspect: { value: this.aspect }
      },
      vertexShader: QUAD_VS, fragmentShader: DROP_FS
    });
    const color = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const target of this.targets) { renderer.setRenderTarget(target); renderer.clear(); }
    renderer.setRenderTarget(null);
    renderer.setClearColor(color, alpha);
  }

  get texture() { return this.targets[0].texture; }

  run(material) {
    material.uniforms.uTex.value = this.targets[0].texture;
    this.quad.material = material;
    const previous = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.targets[1]);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(previous);
    this.targets.reverse();
  }

  // u, v in 0..1; radius as a fraction of the pool's length (v)
  drop(u, v, radius, strength) {
    this.dropMat.uniforms.uCenter.value.set(u, v);
    this.dropMat.uniforms.uRadius.value = radius;
    this.dropMat.uniforms.uStrength.value = strength;
    this.run(this.dropMat);
  }

  step() { this.run(this.updateMat); }
}

// ---------------------------------------------------------------- GLSL ---

export const COMMON = /* glsl */`
uniform float uTime;
uniform float uNight;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uPool;          // half width (x), depth, half length (z)
uniform sampler2D uWater;
uniform vec2 uWaterTexel;
uniform sampler2D uArt;
uniform float uHasArt;
uniform vec3 uTileA, uTileB, uGrout, uBand;
uniform float uTile;
uniform vec3 uLightPos[4];
uniform vec3 uLightCol;
uniform float uLeaves;
uniform float uCaustics;
uniform vec3 uAbsorb;
uniform vec3 uDeep;
uniform vec3 uSkyTop, uSkyHorizon;
uniform float uHills;
uniform vec4 uRobot;         // xyz position, w size (0 = none)
uniform float uExposure;     // 0 = colours as they are; above 0 = soft highlights
uniform float uFog;          // how murky the water looks from inside
uniform vec4 uFloat[2];      // floating toys: x, z, radius, kind (1 ring, 2 ball); radius 0 = none
uniform vec4 uCasters[16];   // things that cast a soft shadow on the ground: x, z, radius, height
uniform float uCasterCount;
uniform sampler2D uSkyTex;   // photographed sky (equirectangular), ready to display
uniform float uHasSkyTex;
uniform float uSkyRot;
uniform float uDirt;         // leaves and dirt on the pool floor (0 = clean)
uniform vec3 uGardenLamps[6];

vec3 finish(vec3 c) { return uExposure > 0.0 ? 1.0 - exp(-max(c, 0.0) * uExposure) : c; }

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }

float sunAmount() { return 1.0 - smoothstep(0.55, 0.82, uNight); }
float lampAmount() { return smoothstep(0.45, 0.9, uNight); }
vec3 sunColor() { return mix(vec3(1.0, 0.96, 0.88), vec3(1.0, 0.56, 0.3), smoothstep(0.2, 0.62, uNight)); }

vec2 poolUv(vec3 p) { return vec2((p.x + uPool.x) / (2.0 * uPool.x), (uPool.z - p.z) / (2.0 * uPool.z)); }
float waterH(vec2 uv) { return texture2D(uWater, uv).r; }

// Small wind ripples that never stop, on top of the simulated waves
vec2 windSlope(vec2 p, float t) {
  vec2 s = vec2(0.0);
  s += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 9.0 + t * 1.9) * 0.010;
  s += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 13.0 + t * 2.4) * 0.007;
  s += vec2(0.95, -0.3) * cos(dot(p, vec2(0.95, -0.3)) * 21.0 + t * 3.1) * 0.005;
  s += vec2(0.2, 0.98) * cos(dot(p, vec2(0.2, 0.98)) * 31.0 - t * 3.7) * 0.003;
  return s;
}

vec3 waterNormal(vec3 p) {
  vec2 uv = poolUv(p);
  float l = waterH(uv - vec2(uWaterTexel.x, 0.0)), r = waterH(uv + vec2(uWaterTexel.x, 0.0));
  float f = waterH(uv - vec2(0.0, uWaterTexel.y)), b = waterH(uv + vec2(0.0, uWaterTexel.y));
  float dx = 4.0 * uPool.x * uWaterTexel.x, dz = 4.0 * uPool.z * uWaterTexel.y;
  vec2 slope = vec2((r - l) / dx, (f - b) / dz) + windSlope(p.xz, uTime);
  return normalize(vec3(-slope.x, 1.0, -slope.y));
}

// Tileable caustics (after "Tileable Water Caustic" by Dave Hoskins / joltz0r)
float causticPattern(vec2 uv, float time) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

vec3 skyColor(vec3 d) {
  d = normalize(d);
  // Below the horizon there is only sea haze
  d.y = max(d.y, 0.003);
  float h = max(d.y, 0.0);
  vec3 day = mix(uSkyHorizon, uSkyTop, pow(h, 0.42));
  vec3 sunset = mix(vec3(1.0, 0.64, 0.42), vec3(0.36, 0.38, 0.66), pow(h, 0.45));
  sunset = mix(sunset, vec3(1.0, 0.5, 0.35), pow(max(dot(d, uSunDir), 0.0), 4.0) * 0.6);
  vec3 night = mix(vec3(0.06, 0.1, 0.22), vec3(0.012, 0.02, 0.06), pow(h, 0.5));
  float n = uNight;
  vec3 col = n < 0.5 ? mix(day, sunset, smoothstep(0.0, 1.0, n * 2.0)) : mix(sunset, night, smoothstep(0.0, 1.0, (n - 0.5) * 2.0));

  if (uHasSkyTex > 0.5) {
    vec2 suv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5 + uSkyRot, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
    vec3 photo = texture2D(uSkyTex, suv).rgb;
    col = mix(photo, col, smoothstep(0.3, 0.8, n));
  } else {
    // Soft clouds by day
    vec2 cp = d.xz / (d.y + 0.12) * 1.3 + vec2(uTime * 0.01, 0.0);
    float cloud = smoothstep(0.55, 0.85, fbm(cp)) * smoothstep(0.02, 0.2, d.y);
    col = mix(col, mix(vec3(1.0), vec3(1.0, 0.72, 0.6), smoothstep(0.2, 0.55, n)), cloud * 0.55 * (1.0 - smoothstep(0.6, 0.9, n)));
  }

  float sd = max(dot(d, uSunDir), 0.0);
  col += sunColor() * (pow(sd, 1500.0) * 8.0 + pow(sd, 90.0) * 0.35 + pow(sd, 8.0) * 0.12) * sunAmount();

  float moonVis = smoothstep(0.7, 1.0, n);
  float md = max(dot(d, uMoonDir), 0.0);
  col += vec3(0.9, 0.93, 1.0) * (smoothstep(0.99955, 0.99975, md) * 1.3 + pow(md, 120.0) * 0.18) * moonVis;
  vec2 sp = d.xz / (d.y + 0.25) * 70.0;
  float star = step(0.986, hash12(floor(sp))) * smoothstep(0.35, 0.0, length(fract(sp) - 0.5));
  col += star * moonVis * smoothstep(0.03, 0.3, d.y) * (0.5 + 0.5 * sin(uTime * 2.0 + hash12(floor(sp)) * 40.0));

  // Distant hills on the horizon (Cap Bon)
  if (uHills > 0.0) {
    float az = atan(d.x, -d.z);
    float ridge = 0.012 + 0.03 * fbm(vec2(az * 3.0, 1.0)) * smoothstep(0.2, 0.9, abs(az + 0.9));
    float hill = smoothstep(ridge + 0.002, ridge, d.y) * step(0.0, d.y);
    vec3 hillCol = mix(mix(vec3(0.55, 0.66, 0.74), vec3(0.62, 0.4, 0.42), smoothstep(0.2, 0.6, n)), vec3(0.03, 0.05, 0.1), smoothstep(0.55, 0.9, n));
    col = mix(col, hillCol, hill * uHills);
  }
  return col;
}

vec3 tileBase(vec3 p, vec3 n) {
  bool floorFace = n.y > 0.5;
  vec2 uv = floorFace ? p.xz : (abs(n.x) > 0.5 ? vec2(p.z, p.y) : vec2(p.x, p.y));
  vec2 t = uv / uTile; vec2 id = floor(t); vec2 f = fract(t) - 0.5;
  float h = hash12(id + (floorFace ? 0.0 : 91.0));
  vec3 col = mix(uTileA, uTileB, h * 0.6);
  col *= 0.93 + 0.1 * hash12(id * 1.7 + 3.0);
  if (floorFace && uHasArt > 0.5) {
    vec2 c = (id + 0.5) * uTile;
    vec4 art = texture2D(uArt, vec2((c.x + uPool.x) / (2.0 * uPool.x), (uPool.z - c.y) / (2.0 * uPool.z)));
    col = mix(col, art.rgb * (0.94 + 0.1 * h), art.a);
  }
  if (!floorFace) col = mix(col, uBand * (0.92 + 0.12 * h), step(-0.1, p.y));
  if (uDirt > 0.0) {
    float grime = smoothstep(0.35, 0.85, vnoise(p.xz * 1.3 + 4.0));
    col = mix(col, col * vec3(0.72, 0.74, 0.55), grime * uDirt);
    if (floorFace) {
      vec2 lp = p.xz * 3.2;
      vec2 lid = floor(lp);
      vec2 lf = fract(lp) - 0.5 - (vec2(hash12(lid), hash12(lid + 7.0)) - 0.5) * 0.5;
      float ang = hash12(lid + 3.0) * 6.28;
      lf = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * lf;
      float leaf = step(0.62, hash12(lid + 11.0)) * smoothstep(0.16, 0.12, length(lf * vec2(1.0, 2.2)));
      col = mix(col, mix(vec3(0.36, 0.26, 0.1), vec3(0.5, 0.42, 0.16), hash12(lid + 5.0)), leaf * uDirt);
    }
  }
  float grout = smoothstep(0.38, 0.48, max(abs(f.x), abs(f.y)));
  col = mix(col, uGrout, grout);
  col *= 1.0 + 0.06 * (0.5 - length(f));
  return col;
}

vec3 lightPool(vec3 p, vec3 n, vec3 base) {
  float depth = clamp(-p.y / uPool.y, 0.0, 1.0);
  float sunAmt = sunAmount();
  vec3 sunCol = sunColor();
  vec3 refrSun = normalize(vec3(uSunDir.x * 0.7, max(uSunDir.y, 0.05) + 0.45, uSunDir.z * 0.7));
  float diff = max(dot(n, refrSun), 0.0);
  float ambient = mix(0.6, 0.05, smoothstep(0.3, 1.0, uNight));
  float edge = min(uPool.x - abs(p.x), uPool.z - abs(p.z));
  float ao = n.y > 0.5 ? mix(0.6, 1.0, smoothstep(0.0, 0.45, edge)) : mix(0.62, 1.0, smoothstep(0.0, 0.35, p.y + uPool.y));
  vec3 light = vec3(ambient) * ao + sunCol * diff * 0.5 * sunAmt;
  if (p.y < 0.0) {
    vec2 cp = p.xz + refrSun.xz / refrSun.y * p.y;
    vec3 wn = waterNormal(vec3(cp.x, 0.0, cp.y));
    cp += wn.xz * 0.9;
    float c = causticPattern(cp * 0.3, uTime * 0.45) + causticPattern(cp * 0.19 + 0.37, uTime * 0.37 + 2.0);
    vec3 sunlit = sunCol * c * uCaustics * sunAmt * mix(1.0, 0.6, depth) * (n.y > 0.5 ? 1.0 : 0.55);
    // Shadows of floating toys, cast along the (bent) sunlight
    vec2 sp = p.xz - refrSun.xz / refrSun.y * p.y;
    float shade = 0.0;
    for (int i = 0; i < 2; i++) {
      vec4 fl = uFloat[i];
      if (fl.z > 0.0) {
        float dd = length(sp - fl.xy);
        float soft = 0.02 + depth * 0.1;
        float tube = fl.z * 0.31;
        shade = max(shade, fl.w > 1.5 ? smoothstep(fl.z + soft, fl.z - soft, dd) : smoothstep(tube + soft, tube - soft, abs(dd - fl.z)));
      }
    }
    light += sunlit * (1.0 - shade);
    light -= sunCol * diff * 0.5 * sunAmt * shade * 0.85;
  }
  if (uLeaves > 0.0) {
    float lf = fbm(p.xz * 0.8 + vec2(sin(uTime * 0.35) * 0.12, cos(uTime * 0.27) * 0.08) + 3.0);
    light *= 1.0 - smoothstep(0.54, 0.64, lf) * 0.4 * uLeaves * sunAmt;
  }
  float lamps = lampAmount();
  if (lamps > 0.0) {
    for (int i = 0; i < 4; i++) {
      vec3 L = uLightPos[i] - p; float d2 = dot(L, L);
      float lam = max(dot(n, normalize(L)), 0.0) * 0.7 + 0.3;
      light += uLightCol * lam * lamps * 1.1 / (0.25 + d2 * 0.9);
      light += uLightCol * smoothstep(0.075, 0.045, sqrt(d2)) * lamps * 6.0;
    }
  }
  return base * light;
}

vec2 intersectBox(vec3 o, vec3 d, vec3 bmin, vec3 bmax) {
  vec3 tMin = (bmin - o) / d, tMax = (bmax - o) / d;
  vec3 t1 = min(tMin, tMax), t2 = max(tMin, tMax);
  return vec2(max(max(t1.x, t1.y), t1.z), min(min(t2.x, t2.y), t2.z));
}

vec3 waterScatter(float dist) {
  vec3 absorb = exp(-uAbsorb * dist);
  vec3 glow = uLightCol * lampAmount() * 0.75;
  return (uDeep * mix(1.0, 0.18, smoothstep(0.35, 1.0, uNight)) + glow) * (1.0 - absorb);
}

// Soft shadows of trees, parasols... on the ground, cast away from the sun
float casterShade(vec3 p) {
  float s = 0.0;
  vec2 away = uSunDir.xz / max(uSunDir.y, 0.2);
  for (int i = 0; i < 16; i++) {
    if (float(i) >= uCasterCount) break;
    vec4 c = uCasters[i];
    vec2 centre = c.xy - away * max(c.w - p.y, 0.0) * 0.85;
    float d = length(p.xz - centre);
    s = max(s, smoothstep(c.z, c.z * 0.45, d));
  }
  return s * sunAmount();
}

vec3 skyAmbient() {
  vec3 a = mix(vec3(0.62, 0.66, 0.7), vec3(0.05, 0.07, 0.14), smoothstep(0.3, 1.0, uNight));
  return mix(a, vec3(0.62, 0.48, 0.45), smoothstep(0.2, 0.5, uNight) * (1.0 - smoothstep(0.55, 0.85, uNight)) * 0.7);
}

vec3 hazeTo(vec3 col, vec3 w, float start) {
  if (start <= 0.0) return col;
  vec3 toCam = w - cameraPosition;
  // Cheap: the haze colour is the sky just above the horizon
  vec3 haze = mix(uSkyHorizon, vec3(1.0, 0.62, 0.45), smoothstep(0.2, 0.55, uNight) * (1.0 - smoothstep(0.55, 0.9, uNight)));
  haze = mix(haze, vec3(0.06, 0.1, 0.22), smoothstep(0.55, 1.0, uNight));
  return mix(col, haze, smoothstep(start, start * 3.5, length(toCam)));
}

// Robot cleaner: a rounded box on the pool floor
vec3 robotColor(vec3 p) {
  vec3 q = (p - uRobot.xyz) / uRobot.w;
  vec3 col = vec3(0.92, 0.95, 0.97);
  col = mix(col, vec3(0.0, 0.7, 0.78), step(0.25, q.y) * step(abs(q.x), 0.7));
  col = mix(col, vec3(0.1, 0.12, 0.15), step(q.y, -0.2));
  return col * (0.55 + 0.45 * max(q.y + 0.6, 0.0));
}

vec3 underwaterRay(vec3 o, vec3 d) {
  d += vec3(1e-6);
  vec2 t = intersectBox(o, d, vec3(-uPool.x, -uPool.y, -uPool.z), vec3(uPool.x, 8.0, uPool.z));
  float tf = t.y;
  // Rays heading up leave through the surface: sky beyond it, or total reflection
  if (d.y > 0.0 && o.y < 0.0) {
    float ts = -o.y / d.y;
    if (ts < tf) {
      vec3 sp = o + d * ts;
      vec3 T = refract(d, -waterNormal(sp), 1.333);
      vec3 c2 = dot(T, T) < 1e-4 ? uDeep * 1.6 + waterScatter(1.0) : mix(uSkyHorizon, uSkyTop, clamp(T.y, 0.0, 1.0));
      return c2 * exp(-uAbsorb * ts) + waterScatter(ts);
    }
  }
  vec3 hp = o + d * tf;
  vec3 n;
  if (hp.y < -uPool.y + 0.002) n = vec3(0.0, 1.0, 0.0);
  else if (abs(hp.x) > uPool.x - 0.002) n = vec3(-sign(hp.x), 0.0, 0.0);
  else n = vec3(0.0, 0.0, -sign(hp.z));
  vec3 col = lightPool(hp, n, tileBase(hp, n));
  if (uRobot.w > 0.0) {
    vec3 half_ = vec3(uRobot.w * 1.0, uRobot.w * 0.45, uRobot.w * 0.8);
    vec2 rt = intersectBox(o, d, uRobot.xyz - half_, uRobot.xyz + half_);
    if (rt.x > 0.0 && rt.x < rt.y && rt.x < tf) {
      vec3 rp = o + d * rt.x;
      tf = rt.x;
      col = robotColor(rp) * (skyAmbient() * 0.8 + sunColor() * 0.45 * sunAmount());
    }
  }
  return col * exp(-uAbsorb * tf) + waterScatter(tf);
}
`;

// What lit objects need (no water tracing): far quicker for the graphics card to prepare
const cut = (from, to) => COMMON.slice(COMMON.indexOf(from), to ? COMMON.indexOf(to) : undefined);
export const LIGHT_COMMON = cut('uniform float uTime;', 'vec2 poolUv') + cut('vec3 waterScatter', '// Robot cleaner');

const WATER_VS = /* glsl */`
uniform sampler2D uWater; uniform vec3 uPool;
varying vec3 vWorld;
void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 uv = vec2((p.x + uPool.x) / (2.0 * uPool.x), (uPool.z - p.z) / (2.0 * uPool.z));
  p.y += texture2D(uWater, uv).r;
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const WATER_FS = /* glsl */`
${COMMON}
uniform float uUnder;
varying vec3 vWorld;
void main() {
  bool below = uUnder > 0.5;
  vec3 N = waterNormal(vWorld);
  if (below) N = -N;
  vec3 V = normalize(vWorld - cameraPosition);
  vec3 R = reflect(V, N);
  if (!below) R.y = abs(R.y);
  vec3 T = refract(V, N, below ? 1.333 : 1.0 / 1.333);
  bool tir = dot(T, T) < 1e-4;
  // One trip through the pool, one look at the sky
  vec3 inside = underwaterRay(vWorld, below ? R : T);
  vec3 sky = skyColor(below ? (tir ? vec3(0.0, 1.0, 0.0) : T) : R);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, -V), 0.0), 5.0);
  vec3 col;
  if (!below) {
    col = mix(inside, sky, fres);
    float s = max(dot(R, uSunDir), 0.0);
    col += sunColor() * (pow(s, 1200.0) * 10.0 + pow(s, 120.0) * 0.5) * sunAmount();
    float m = max(dot(R, uMoonDir), 0.0);
    col += vec3(0.8, 0.88, 1.0) * pow(m, 600.0) * 3.0 * smoothstep(0.75, 1.0, uNight);
  } else {
    col = tir ? inside : mix(sky * 1.15 + sunColor() * pow(max(dot(T, uSunDir), 0.0), 40.0) * sunAmount(), inside, fres);
    float d = length(vWorld - cameraPosition) * uFog;
    col = col * exp(-uAbsorb * d) + waterScatter(d);
  }
  gl_FragColor = vec4(finish(col), 1.0);
}`;

const POOL_VS = /* glsl */`
varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = -normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const POOL_FS = /* glsl */`
${COMMON}
uniform float uUnder;
varying vec3 vWorld; varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 col = lightPool(vWorld, n, tileBase(vWorld, n));
  if (uUnder > 0.5) {
    float d = length(vWorld - cameraPosition) * uFog;
    col = col * exp(-uAbsorb * d) + waterScatter(d);
  }
  gl_FragColor = vec4(finish(col), 1.0);
}`;

// Stone, wood, fabric, leaves: lit by the same sun, sky and pool lights
const LIT_VS = /* glsl */`
uniform float uTime; uniform float uSway;
varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv;
void main() {
  vec3 p = position;
  if (uSway > 0.0) {
    float w = uv.x;
    p.y += sin(uTime * 1.6 + position.x * 2.0 + position.z) * 0.04 * w * w * uSway;
    p.x += sin(uTime * 1.1 + position.y * 3.0) * 0.03 * w * w * uSway;
  }
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const LIT_FS = /* glsl */`
${LIGHT_COMMON}
uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; uniform float uAlphaTest;
uniform float uEmissive; uniform vec3 uEmissiveCol; uniform float uPoolGlow; uniform float uLeafShadow; uniform float uWorldUv; uniform float uHaze;
uniform float uUnder; uniform float uRecv;
varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv;
void main() {
  vec3 nw = normalize(vNormal);
  vec2 uv = vUv;
  if (uWorldUv > 0.0) uv = (abs(nw.y) > 0.5 ? vWorld.xz : (abs(nw.x) > 0.5 ? vWorld.zy : vWorld.xy)) * uWorldUv;
  vec4 tex = uHasMap > 0.5 ? texture2D(uMap, uv) : vec4(1.0);
  if (tex.a < uAlphaTest) discard;
  vec3 base = uColor * tex.rgb;
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  float sunAmt = sunAmount();
  float diff = max(dot(n, uSunDir), 0.0);
  vec3 skyAmb = mix(vec3(0.62, 0.66, 0.7), vec3(0.05, 0.07, 0.14), smoothstep(0.3, 1.0, uNight));
  skyAmb = mix(skyAmb, vec3(0.62, 0.48, 0.45), smoothstep(0.2, 0.5, uNight) * (1.0 - smoothstep(0.55, 0.85, uNight)) * 0.7);
  vec3 light = skyAmb * (0.6 + 0.4 * n.y) + sunColor() * diff * 0.75 * sunAmt;
  // Moonlight: cool and soft
  light += vec3(0.32, 0.4, 0.62) * max(dot(n, uMoonDir), 0.0) * 0.35 * smoothstep(0.6, 1.0, uNight);
  // Warm garden lamps (lanterns by the villa and along the path)
  float lampsOn = lampAmount();
  if (lampsOn > 0.0) {
    for (int i = 0; i < 6; i++) {
      vec3 L = uGardenLamps[i] - vWorld; float d2 = dot(L, L);
      light += vec3(1.0, 0.72, 0.4) * lampsOn * (max(dot(n, normalize(L)), 0.0) * 0.7 + 0.3) * 0.9 / (0.3 + d2 * 1.4);
    }
  }
  if (uLeafShadow > 0.0) {
    float lf = fbm(vWorld.xz * 0.8 + vec2(sin(uTime * 0.35) * 0.12, cos(uTime * 0.27) * 0.08) + 3.0);
    light -= sunColor() * diff * 0.6 * sunAmt * smoothstep(0.54, 0.64, lf) * uLeafShadow;
  }
  if (uRecv > 0.0) light -= sunColor() * diff * 0.72 * sunAmt * casterShade(vWorld) * uRecv;
  // The pool lights up what is around it at night
  if (uPoolGlow > 0.0) {
    vec2 q = max(abs(vWorld.xz) - uPool.xz, 0.0);
    float dist = length(q) + max(vWorld.y, 0.0) * 0.6;
    light += uLightCol * lampAmount() * uPoolGlow * 0.5 / (1.0 + dist * dist * 1.6);
  }
  vec3 col = base * light + uEmissiveCol * uEmissive;
  // Seen from underwater, things fade into the water
  if (uUnder > 0.5) {
    float d = length(vWorld - cameraPosition) * uFog;
    col = col * exp(-uAbsorb * d) + waterScatter(d);
  }
  // Far away, things fade into the sky
  col = hazeTo(col, vWorld, uHaze);
  gl_FragColor = vec4(finish(col), 1.0);
}`;

const SEA_FS = /* glsl */`
${COMMON}
varying vec3 vWorld;
float waves(vec2 p, float t) {
  float h = 0.0;
  h += sin(dot(p, vec2(0.12, 0.99)) * 0.9 + t * 0.9) * 0.18;
  h += sin(dot(p, vec2(-0.6, 0.8)) * 1.7 + t * 1.3) * 0.08;
  h += sin(dot(p, vec2(0.9, 0.44)) * 3.1 + t * 1.9) * 0.04;
  h += sin(dot(p, vec2(-0.3, -0.95)) * 5.3 + t * 2.6) * 0.02;
  h += (fbm(p * 0.6 + t * 0.15) - 0.5) * 0.12;
  return h;
}
void main() {
  vec2 p = vWorld.xz; float t = uTime;
  float e = 0.15;
  float h0 = waves(p, t);
  vec3 n = normalize(vec3(-(waves(p + vec2(e, 0.0), t) - h0) / e, 1.0, -(waves(p + vec2(0.0, e), t) - h0) / e));
  float dist = length(vWorld.xz - cameraPosition.xz);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(30.0, 250.0, dist)));
  vec3 V = normalize(vWorld - cameraPosition);
  vec3 R = reflect(V, n); R.y = abs(R.y);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, -V), 0.0), 5.0);
  vec3 deep = mix(vec3(0.02, 0.26, 0.4), vec3(0.005, 0.02, 0.05), smoothstep(0.35, 1.0, uNight));
  vec3 col = mix(deep, skyColor(R), fres);
  col += sunColor() * pow(max(dot(R, uSunDir), 0.0), 260.0) * 5.0 * sunAmount();
  col += vec3(0.8, 0.88, 1.0) * pow(max(dot(R, uMoonDir), 0.0), 300.0) * 2.5 * smoothstep(0.75, 1.0, uNight);
  // Moon path: a column of glitter on the waves under the moon
  vec2 toMoon = normalize(uMoonDir.xz);
  vec2 rel = vWorld.xz - cameraPosition.xz;
  float along = dot(rel, toMoon), across = abs(rel.x * toMoon.y - rel.y * toMoon.x);
  float path = smoothstep(along * 0.07 + 4.0, 0.0, across) * step(0.0, along);
  float glitter = pow(max(dot(R, uMoonDir), 0.0), 8.0) * smoothstep(0.62, 0.9, vnoise(vWorld.xz * 1.4 + t * 0.7));
  col += vec3(0.85, 0.9, 1.0) * path * glitter * 1.6 * smoothstep(0.75, 1.0, uNight);
  vec3 haze = skyColor(normalize(vec3(V.x, 0.004, V.z)));
  col = mix(col, haze, smoothstep(60.0, 700.0, dist));
  gl_FragColor = vec4(finish(col), 1.0);
}`;

const SKY_FS = /* glsl */`
${COMMON}
varying vec3 vWorld;
void main() { gl_FragColor = vec4(finish(skyColor(normalize(vWorld - cameraPosition))), 1.0); }`;

const WORLD_VS = /* glsl */`
varying vec3 vWorld;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

// ------------------------------------------------------------- the pool ---

export class PoolWorld {
  // size: [half width, half length]; depth; colours and extras per concept
  constructor(renderer, options = {}) {
    const o = {
      size: [2.4, 2.0], depth: 0.8, rim: 0.03, simWidth: 256, tile: 0.06,
      tileA: '#bfe9f2', tileB: '#8fd3e6', grout: '#e8f6f8', band: '#1d6f8a',
      absorb: [0.34, 0.085, 0.065], deep: [0.04, 0.42, 0.5],
      skyTop: '#3f9fe0', skyHorizon: '#dff1fa', hills: 0, leaves: 0, caustics: 1.0,
      lightCol: [0.35, 0.95, 1.0], art: null, ...options
    };
    this.options = o;
    this.renderer = renderer;
    const [hx, hz] = o.size;
    this.hx = hx; this.hz = hz;
    const simH = Math.round(o.simWidth * hz / hx);
    this.sim = new WaterSim(renderer, o.simWidth, simH);

    const col = (c) => new THREE.Color(c);
    const lights = [
      new THREE.Vector3(-hx + 0.01, -o.depth * 0.45, -hz * 0.45), new THREE.Vector3(-hx + 0.01, -o.depth * 0.45, hz * 0.45),
      new THREE.Vector3(hx - 0.01, -o.depth * 0.45, -hz * 0.45), new THREE.Vector3(hx - 0.01, -o.depth * 0.45, hz * 0.45)
    ];
    this.uniforms = {
      uTime: { value: 0 }, uNight: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.55, -0.78).normalize() },
      uMoonDir: { value: new THREE.Vector3(0.3, 0.13, -0.95).normalize() },
      uPool: { value: new THREE.Vector3(hx, o.depth, hz) },
      uWater: { value: this.sim.texture },
      uWaterTexel: { value: new THREE.Vector2(1 / o.simWidth, 1 / simH) },
      uArt: { value: o.art ? new THREE.CanvasTexture(o.art) : null },
      uHasArt: { value: o.art ? 1 : 0 },
      uTileA: { value: col(o.tileA) }, uTileB: { value: col(o.tileB) }, uGrout: { value: col(o.grout) }, uBand: { value: col(o.band) },
      uTile: { value: o.tile },
      uLightPos: { value: lights }, uLightCol: { value: new THREE.Vector3(...o.lightCol) },
      uLeaves: { value: o.leaves }, uCaustics: { value: o.caustics },
      uAbsorb: { value: new THREE.Vector3(...o.absorb) }, uDeep: { value: new THREE.Vector3(...o.deep) },
      uSkyTop: { value: col(o.skyTop) }, uSkyHorizon: { value: col(o.skyHorizon) },
      uHills: { value: o.hills },
      uRobot: { value: new THREE.Vector4(0, 0, 0, 0) },
      uExposure: { value: o.exposure || 0 }, uFog: { value: o.fog || 1 },
      uUnder: { value: 0 },
      uFloat: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
      uGardenLamps: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, -99, 0)) },
      uSkyTex: { value: null }, uHasSkyTex: { value: 0 }, uSkyRot: { value: 0 }, uDirt: { value: 0 },
      uCasters: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) }, uCasterCount: { value: 0 }
    };
    if (this.uniforms.uArt.value) {
      this.uniforms.uArt.value.minFilter = THREE.LinearFilter;
      this.uniforms.uArt.value.generateMipmaps = false;
    }

    this.group = new THREE.Group();

    // Water surface
    const waterGeo = new THREE.PlaneGeometry(hx * 2, hz * 2, o.simWidth, simH);
    waterGeo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(waterGeo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: WATER_VS, fragmentShader: WATER_FS, side: THREE.DoubleSide
    }));
    this.group.add(this.water);

    // Pool walls and floor (inside of a box, without its top)
    const boxH = o.depth + o.rim;
    const boxGeo = new THREE.BoxGeometry(hx * 2, boxH, hz * 2);
    boxGeo.translate(0, (o.rim - o.depth) / 2, 0);
    const poolMat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: POOL_VS, fragmentShader: POOL_FS, side: THREE.BackSide });
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    this.poolMesh = new THREE.Mesh(boxGeo, [poolMat, poolMat, hidden, poolMat, poolMat, poolMat]);
    this.group.add(this.poolMesh);

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.lastDrop = null;
    this.accum = 0;
    this.idle = 0;
  }

  // A material lit like the rest of the scene
  lit({ color = '#ffffff', map = null, alphaTest = 0, sway = 0, emissive = 0, emissiveColor = '#ffffff', poolGlow = 1, leafShadow = 0, worldUv = 0, haze = 0, recv = 0, side = THREE.FrontSide } = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        uColor: { value: new THREE.Color(color) }, uMap: { value: map }, uHasMap: { value: map ? 1 : 0 },
        uAlphaTest: { value: alphaTest }, uSway: { value: sway }, uEmissive: { value: emissive },
        uEmissiveCol: { value: new THREE.Color(emissiveColor) }, uPoolGlow: { value: poolGlow }, uLeafShadow: { value: leafShadow }, uWorldUv: { value: worldUv }, uHaze: { value: haze }, uRecv: { value: recv }
      },
      vertexShader: LIT_VS, fragmentShader: LIT_FS, side
    });
  }

  sky(radius = 900) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WORLD_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false }));
    mesh.renderOrder = -10;
    return mesh;
  }

  sea(y = -6, size = 2400, centre = [0, -1200]) {
    const geo = new THREE.PlaneGeometry(size, size, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WORLD_VS, fragmentShader: SEA_FS }));
    mesh.position.set(centre[0], y, centre[1]);
    return mesh;
  }

  // The photographed sky, baked once into a display image (public/plongee/
  // sky.jpg) with where its sun is and its horizon and zenith colours
  useSkyImage(texture, { skyRot, sunDir, horizon, top }) {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    this.uniforms.uSkyTex.value = texture;
    this.uniforms.uHasSkyTex.value = 1;
    this.uniforms.uSkyRot.value = skyRot;
    this.uniforms.uSunDir.value.fromArray(sunDir).normalize();
    this.uniforms.uSkyHorizon.value.fromArray(horizon);
    this.uniforms.uSkyTop.value.fromArray(top);
  }

  // Frees the graphics memory (leaving the page)
  dispose() {
    for (const target of this.sim.targets) target.dispose();
    this.sim.updateMat.dispose();
    this.sim.dropMat.dispose();
    this.uniforms.uArt.value?.dispose();
  }

  // Pool coordinates (x, z) → simulation (u, v)
  toSim(x, z) { return [(x + this.hx) / (2 * this.hx), (this.hz - z) / (2 * this.hz)]; }

  drop(x, z, radius, strength) {
    if (Math.abs(x) > this.hx || Math.abs(z) > this.hz) return;
    const [u, v] = this.toSim(x, z);
    this.sim.drop(u, v, radius, strength);
  }

  // Pointer over the canvas (normalised device coordinates) → ripples
  touch(ndc, camera, strength = 0.012, radius = 0.028) {
    this.raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return null;
    this.group.worldToLocal(hit);
    if (Math.abs(hit.x) > this.hx || Math.abs(hit.z) > this.hz) { this.lastDrop = null; return null; }
    if (this.lastDrop && this.lastDrop.distanceTo(hit) < 0.05) return hit;
    this.drop(hit.x, hit.z, radius, strength);
    this.lastDrop = hit.clone();
    return hit;
  }

  update(dt, camera, { idleDrops = true } = {}) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uUnder.value = camera.position.y < this.group.position.y ? 1 : 0;
    if (idleDrops) {
      this.idle += dt;
      while (this.idle > 0.12) {
        this.idle -= 0.12;
        this.drop((Math.random() * 2 - 1) * this.hx * 0.95, (Math.random() * 2 - 1) * this.hz * 0.95, 0.012 + Math.random() * 0.012, (Math.random() - 0.5) * 0.004);
      }
    }
    this.accum += Math.min(dt, 0.05);
    const stepTime = 1 / 90;
    while (this.accum > stepTime) { this.sim.step(); this.accum -= stepTime; }
    this.uniforms.uWater.value = this.sim.texture;
  }
}

// ------------------------------------------------------------ helpers ---

export const canvasTexture = (width, height, draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

// Warm travertine stone
export const stoneTexture = (tint = [236, 226, 208], seed = 1) => canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = `rgb(${tint.join(',')})`;
  ctx.fillRect(0, 0, w, h);
  let s = seed * 9301;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 3 + 0.5;
    const d = (rnd() - 0.5) * 26;
    ctx.fillStyle = `rgba(${tint[0] + d},${tint[1] + d},${tint[2] + d},${0.25 + rnd() * 0.3})`;
    ctx.fillRect(x, y, r * 6, r);
  }
  // Slab joints
  ctx.strokeStyle = 'rgba(120,110,95,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, i * h / 2); ctx.lineTo(w, i * h / 2); ctx.stroke(); }
  for (let r = 0; r < 2; r++) for (let i = 0; i <= 1; i++) {
    const x = (i + (r % 2) * 0.5) * w / 1;
    ctx.beginPath(); ctx.moveTo(x % w, r * h / 2); ctx.lineTo(x % w, (r + 1) * h / 2); ctx.stroke();
  }
});

// A palm frond drawn with its leaflets (alpha)
export const frondTexture = () => canvasTexture(512, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#3c6b2a'); grad.addColorStop(1, '#6fa34a');
  ctx.strokeStyle = '#5b4a2a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  ctx.fillStyle = grad;
  for (let x = 8; x < w - 6; x += 7) {
    const len = (h / 2 - 3) * Math.sin(Math.min(1, x / w * 1.2) * Math.PI) ** 0.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, h / 2);
      ctx.quadraticCurveTo(x + 6, h / 2 + side * len * 0.55, x + 26, h / 2 + side * len);
      ctx.quadraticCurveTo(x + 14, h / 2 + side * len * 0.4, x + 9, h / 2);
      ctx.fill();
    }
  }
});

// Low, stylised palm tree
export const palmTree = (world, { height = 3.2, lean = 0.5, fronds = 11, seed = 0 } = {}) => {
  const group = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector3(Math.sin(t * 1.2) * lean * t, t * height, Math.sin(t * 2.0 + seed) * 0.1 * t));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const bark = canvasTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8a7152'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) { ctx.fillStyle = 'rgba(60,45,30,0.55)'; ctx.fillRect(0, y, w, 3); }
  });
  bark.texture.wrapS = bark.texture.wrapT = THREE.RepeatWrapping;
  bark.texture.repeat.set(1, 6);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.09, 10), world.lit({ map: bark.texture, color: '#ffffff' }));
  group.add(trunk);
  const top = curve.getPoint(1);
  const leaf = frondTexture();
  // Without mipmaps the leaflets stay solid at a distance
  leaf.texture.generateMipmaps = false;
  leaf.texture.minFilter = THREE.LinearFilter;
  const frondGeo = new THREE.PlaneGeometry(1.9, 0.85, 16, 1);
  frondGeo.translate(0.95, 0, 0);
  const pos = frondGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getY(i));
    pos.setY(i, 0.35 * x - 0.32 * x * x);
  }
  frondGeo.computeVertexNormals();
  const mat = world.lit({ map: leaf.texture, alphaTest: 0.5, sway: 1, side: THREE.DoubleSide, color: '#ffffff' });
  for (let i = 0; i < fronds; i++) {
    const f = new THREE.Mesh(frondGeo, mat);
    f.position.copy(top);
    f.rotation.y = (i / fronds) * Math.PI * 2 + seed;
    f.rotation.z = -0.15 + ((i * 37) % 5) * 0.08;
    group.add(f);
  }
  return group;
};

// The 8-pointed star of Tunisian zellige, as a floor mosaic
export const zelligeArt = (hx, hz, { color = '#0b4f6c', accent = '#f2c14e' } = {}) => {
  const w = 512, h = Math.round(512 * hz / hx);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const cx = w / 2, cy = h / 2, r = h * 0.3;
  const star = (radius, fill) => {
    ctx.fillStyle = fill;
    for (const rot of [0, Math.PI / 4]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.fillRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
      ctx.restore();
    }
  };
  star(r, color);
  star(r * 0.78, '#e9f7fa');
  star(r * 0.62, accent);
  star(r * 0.4, color);
  ctx.strokeStyle = color; ctx.lineWidth = h * 0.025;
  ctx.strokeRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84);
  return canvas;
};
