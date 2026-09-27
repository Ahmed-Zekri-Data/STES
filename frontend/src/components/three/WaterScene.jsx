import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/*
 * The home page's water: a WebGL pool surface with a striped pool ring
 * floating on it.
 *
 * - Waves roll all the time; clicking or tapping the water sends a ripple,
 *   which also pushes the ring. A few "raindrops" ripple on their own.
 * - Light theme: sunlit turquoise water with glints. Dark theme: night
 *   water whose crests and ripples glow (bioluminescence).
 * - The camera leans towards the pointer and dips as the page scrolls.
 * - It only draws while visible, and holds still for visitors who asked
 *   for less motion.
 *
 * The wave formulas exist twice, in the vertex shader and in waveHeight()
 * below (for the ring to float on the same water): keep them identical.
 */

const RIPPLES = 8;

const WAVES = [
  // [x frequency, z frequency, speed, amplitude]
  [0.32, 0, 0.55, 0.22],
  [0.17, 0.41, 0.72, 0.17],
  [0.83, 0.83, 1.15, 0.06],
  [1.63, -1.21, 1.7, 0.035],
  [2.9, 2.3, 2.4, 0.012]
];

// Numbers written into GLSL must be floats (1 → 1.0)
const f = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform vec4 uRipples[${RIPPLES}];
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vHeight;
  varying float vRipple;

  float ripples(vec2 p) {
    float h = 0.0;
    for (int i = 0; i < ${RIPPLES}; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 7.0) continue;
      float d = distance(p, r.xy);
      float envelope = exp(-pow(d - age * 2.4, 2.0) * 0.6) * exp(-age * 0.55) / (1.0 + d * 0.25);
      h += sin(d * 3.2 - age * 7.5) * envelope * r.w;
    }
    return h;
  }

  float waves(vec2 p) {
    float t = uTime;
    return sin(p.x * ${f(WAVES[0][0])} + t * ${f(WAVES[0][2])}) * ${f(WAVES[0][3])}
      + sin(p.x * ${f(WAVES[1][0])} + p.y * ${f(WAVES[1][1])} + t * ${f(WAVES[1][2])}) * ${f(WAVES[1][3])}
      + sin(p.x * ${f(WAVES[2][0])} + p.y * ${f(WAVES[2][1])} + t * ${f(WAVES[2][2])}) * ${f(WAVES[2][3])}
      + sin(p.x * ${f(WAVES[3][0])} + p.y * ${f(WAVES[3][1])} + t * ${f(WAVES[3][2])}) * ${f(WAVES[3][3])}
      + sin(p.x * ${f(WAVES[4][0])} + p.y * ${f(WAVES[4][1])} + t * ${f(WAVES[4][2])}) * ${f(WAVES[4][3])};
  }

  float height(vec2 p, out float ripple) {
    ripple = ripples(p) * 0.32;
    float swell = exp(-pow(distance(p, uPointer), 2.0) * 0.35) * uPointerStrength * 0.22;
    return waves(p) + ripple + swell;
  }

  void main() {
    vec3 pos = position;
    float ripple;
    float unused;
    float h = height(pos.xz, ripple);
    float e = 0.08;
    float hx = height(pos.xz + vec2(e, 0.0), unused);
    float hz = height(pos.xz + vec2(0.0, e), unused);
    pos.y += h;
    vHeight = h;
    vRipple = ripple;
    vNormalW = normalize(vec3(h - hx, e, h - hz));
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uHighlight;
  uniform vec3 uGlowA;
  uniform vec3 uGlowB;
  uniform vec3 uFog;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vHeight;
  varying float vRipple;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);

    vec3 color = mix(uDeep, uShallow, smoothstep(-0.35, 0.45, vHeight));
    color = mix(color, uSky, fresnel * 0.8);

    // Sun (or moon) on the water: a soft highlight and tiny sparkles
    vec3 halfway = normalize(uSunDir + v);
    float facing = max(dot(n, halfway), 0.0);
    color += uHighlight * (pow(facing, 220.0) * 0.9 + pow(facing, 1500.0) * 3.0);

    // Daylight caustics shimmering across the surface
    float caustic = sin(vWorld.x * 2.1 + uTime * 1.3 + sin(vWorld.z * 1.7 + uTime))
      * sin(vWorld.z * 2.4 - uTime * 1.1 + sin(vWorld.x * 1.3));
    color += uHighlight * smoothstep(0.72, 1.0, caustic) * 0.07 * (1.0 - uNight);

    // Night: crests and ripple fronts glow
    float glow = smoothstep(0.16, 0.42, vHeight) * 0.45 + smoothstep(0.015, 0.16, abs(vRipple)) * 1.1;
    vec3 bio = mix(uGlowA, uGlowB, 0.5 + 0.5 * sin(vWorld.x * 0.3 + vWorld.z * 0.2 + uTime * 0.4));
    color += bio * glow * uNight * 0.6;

    // Far water melts into the page
    float distance = length(vWorld.xz - cameraPosition.xz);
    color = mix(color, uFog, smoothstep(8.0, 28.0, distance));
    gl_FragColor = vec4(color, 1.0 - smoothstep(20.0, 30.0, distance));
  }
`;

const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aSeed;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.08 + aSeed * 0.12), 5.0) + 0.3;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.4;
    vTwinkle = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 30.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + aSeed) * (10.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * uOpacity * vTwinkle);
  }
`;

// A theme colour from the CSS variables, as 0–1 sRGB
const cssColor = (name) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [r, g, b] = value.split(/\s+/).map(Number);
  return new THREE.Vector3(r / 255, g / 255, b / 255);
};

const isNight = () => document.documentElement.classList.contains('dark');

const themeColors = () => (isNight()
  ? {
    deep: new THREE.Vector3(0.008, 0.03, 0.06),
    shallow: new THREE.Vector3(0.02, 0.14, 0.2),
    sky: new THREE.Vector3(0.06, 0.1, 0.18),
    highlight: new THREE.Vector3(0.75, 0.85, 1.0),
    glowA: cssColor('--aqua-t500'),
    glowB: cssColor('--violet-t500'),
    fog: cssColor('--page'),
    sun: new THREE.Vector3(-0.4, 0.5, -1).normalize(),
    night: 1,
    ring: ['#0e1726', '#2dd4ee'],
    particles: { color: new THREE.Vector3(0.45, 0.9, 1.0), opacity: 0.9, size: 5.5 }
  }
  : {
    deep: cssColor('--aqua-700'),
    shallow: cssColor('--aqua-300'),
    sky: new THREE.Vector3(0.93, 0.98, 1.0),
    highlight: new THREE.Vector3(1.0, 0.98, 0.9),
    glowA: cssColor('--aqua-400'),
    glowB: cssColor('--violet-400'),
    fog: cssColor('--page'),
    sun: new THREE.Vector3(0.3, 0.8, -0.9).normalize(),
    night: 0,
    ring: ['#ffffff', '#f2553d'],
    particles: { color: new THREE.Vector3(1, 1, 1), opacity: 0.55, size: 3.5 }
  });

// Height of the water at (x, z): the same waves as the shader
const waveHeight = (x, z, t, ripples) => {
  let h = 0;
  for (const [fx, fz, speed, amplitude] of WAVES) {
    h += Math.sin(x * fx + z * fz + t * speed) * amplitude;
  }
  for (const r of ripples) {
    const age = t - r.z;
    if (r.w <= 0 || age < 0 || age > 7) continue;
    const d = Math.hypot(x - r.x, z - r.y);
    const envelope = Math.exp(-((d - age * 2.4) ** 2) * 0.6) * Math.exp(-age * 0.55) / (1 + d * 0.25);
    h += Math.sin(d * 3.2 - age * 7.5) * envelope * r.w * 0.32;
  }
  return h;
};

// Stripes around the ring, like a classic pool float
const ringTexture = ([a, b]) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fillRect(i * 64, 0, 64, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const WaterScene = ({ eventSource, onReady, onError }) => {
  const mount = useRef(null);

  useEffect(() => {
    const container = mount.current;
    const source = eventSource?.current || container;
    if (!container) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 768;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      onError?.(error);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    const lookAt = new THREE.Vector3(0, 0, -6);

    // Water
    const segments = small ? 140 : 220;
    const waterGeometry = new THREE.PlaneGeometry(64, 64, segments, segments);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, 0, -10);
    const ripples = Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0));
    const uniforms = {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerStrength: { value: 0 },
      uRipples: { value: ripples },
      uDeep: { value: new THREE.Vector3() },
      uShallow: { value: new THREE.Vector3() },
      uSky: { value: new THREE.Vector3() },
      uHighlight: { value: new THREE.Vector3() },
      uGlowA: { value: new THREE.Vector3() },
      uGlowB: { value: new THREE.Vector3() },
      uFog: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3() }
    };
    const waterMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    scene.add(water);

    // Pool ring
    const ringGeometry = new THREE.TorusGeometry(0.95, 0.36, 40, 110);
    ringGeometry.rotateX(Math.PI / 2);
    const ringMaterial = new THREE.MeshPhysicalMaterial({
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.4,
      emissive: new THREE.Color(0x000000)
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ring);
    // Resting spot: lower right on wide screens (clear of the headline and
    // the featured product), centred further back on phones
    const ringState = { x: small ? 1.4 : 3.4, z: small ? 1.6 : 1.2, vx: 0, vz: 0, spin: 0.15 };
    const ringHome = { x: ringState.x, z: ringState.z };

    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x0a4a5a, 0.6));

    // Light motes above the water
    const count = small ? 120 : 260;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = -Math.random() * 22 + 4;
      seeds[i] = Math.random();
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const particleUniforms = {
      uTime: { value: 0 },
      uSize: { value: 4 },
      uColor: { value: new THREE.Vector3(1, 1, 1) },
      uOpacity: { value: 0.6 }
    };
    const particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: particleUniforms,
      transparent: true,
      depthWrite: false
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    let ringMap;
    const applyTheme = () => {
      const colors = themeColors();
      uniforms.uDeep.value.copy(colors.deep);
      uniforms.uShallow.value.copy(colors.shallow);
      uniforms.uSky.value.copy(colors.sky);
      uniforms.uHighlight.value.copy(colors.highlight);
      uniforms.uGlowA.value.copy(colors.glowA);
      uniforms.uGlowB.value.copy(colors.glowB);
      uniforms.uFog.value.copy(colors.fog);
      uniforms.uSunDir.value.copy(colors.sun);
      uniforms.uNight.value = colors.night;
      sun.position.copy(colors.sun).multiplyScalar(10);
      sun.intensity = colors.night ? 0.5 : 1.6;
      ringMap?.dispose();
      ringMap = ringTexture(colors.ring);
      ringMaterial.map = ringMap;
      ringMaterial.emissiveMap = colors.night ? ringMap : null;
      ringMaterial.emissive.set(colors.night ? 0x2dd4ee : 0x000000);
      ringMaterial.emissiveIntensity = colors.night ? 0.45 : 0;
      ringMaterial.needsUpdate = true;
      particleUniforms.uColor.value.copy(colors.particles.color);
      particleUniforms.uOpacity.value = colors.particles.opacity;
      particleUniforms.uSize.value = colors.particles.size;
      particleMaterial.blending = colors.night ? THREE.AdditiveBlending : THREE.NormalBlending;
      particleMaterial.needsUpdate = true;
    };
    applyTheme();

    // Ripples
    let nextRipple = 0;
    let time = reduceMotion ? 3 : 0;
    const addRipple = (x, z, strength) => {
      ripples[nextRipple].set(x, z, time, strength);
      nextRipple = (nextRipple + 1) % RIPPLES;
      // The wave pushes the ring away from where it started
      const dx = ringState.x - x;
      const dz = ringState.z - z;
      const d = Math.hypot(dx, dz) || 1;
      const push = (strength * 2.2) / (1 + d * d * 0.18);
      ringState.vx += (dx / d) * push;
      ringState.vz += (dz / d) * push;
      ringState.spin += (Math.random() - 0.5) * push * 0.6;
    };

    // Pointer → a point on the water
    const raycaster = new THREE.Raycaster();
    const surface = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    let pointerTarget = 0;
    const toWater = (event) => {
      const box = renderer.domElement.getBoundingClientRect();
      ndc.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(surface, hit);
    };
    const onMove = (event) => {
      const box = renderer.domElement.getBoundingClientRect();
      lean.tx = ((event.clientX - box.left) / box.width - 0.5) * 2;
      lean.ty = ((event.clientY - box.top) / box.height - 0.5) * 2;
      if (toWater(event)) {
        uniforms.uPointer.value.set(hit.x, hit.z);
        pointerTarget = 1;
      } else {
        pointerTarget = 0;
      }
    };
    const onLeave = () => { pointerTarget = 0; lean.tx = 0; lean.ty = 0; };
    const onDown = (event) => {
      if (event.target.closest?.('a, button, input, select, textarea, label')) return;
      if (toWater(event)) addRipple(hit.x, hit.z, 1.1);
    };
    source.addEventListener('pointermove', onMove);
    source.addEventListener('pointerleave', onLeave);
    source.addEventListener('pointerdown', onDown);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
      camera.aspect = width / height;
      camera.fov = width < 640 ? 55 : 42;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(() => { resize(); if (reduceMotion) render(0); });
    resizeObserver.observe(container);
    resize();

    const place = (dt) => {
      // Float the ring: drift back home, slow down, follow the water
      ringState.vx += (ringHome.x - ringState.x) * 0.35 * dt;
      ringState.vz += (ringHome.z - ringState.z) * 0.35 * dt;
      const damping = Math.exp(-1.1 * dt);
      ringState.vx *= damping;
      ringState.vz *= damping;
      ringState.spin *= Math.exp(-0.4 * dt);
      ringState.x += ringState.vx * dt;
      ringState.z += ringState.vz * dt;
      const { x, z } = ringState;
      const h = waveHeight(x, z, time, ripples);
      const slopeX = (waveHeight(x + 0.3, z, time, ripples) - h) / 0.3;
      const slopeZ = (waveHeight(x, z + 0.3, time, ripples) - h) / 0.3;
      ring.position.set(x, h + 0.02, z);
      ring.rotation.set(slopeZ * 0.9, ring.rotation.y + ringState.spin * dt, -slopeX * 0.9);
    };

    const scrollDip = () => {
      const box = container.getBoundingClientRect();
      return Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)));
    };

    const render = (dt) => {
      uniforms.uTime.value = time;
      particleUniforms.uTime.value = time;
      uniforms.uPointerStrength.value += (pointerTarget - uniforms.uPointerStrength.value) * Math.min(1, dt * 4);
      lean.x += (lean.tx - lean.x) * Math.min(1, dt * 3);
      lean.y += (lean.ty - lean.y) * Math.min(1, dt * 3);
      const dip = scrollDip();
      camera.position.set(lean.x * 0.7, 2.7 - dip * 1.5 - lean.y * 0.25, 8.2 - dip * 1.5);
      camera.lookAt(lookAt.x + lean.x * 0.4, lookAt.y - dip * 0.8, lookAt.z);
      place(dt);
      renderer.render(scene, camera);
    };

    // Draw only while visible; hold still when asked for less motion
    let frame = 0;
    let visible = true;
    let last = performance.now();
    let rainAt = 1.2;
    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      time += dt;
      if (time > rainAt) {
        addRipple((Math.random() - 0.5) * 14, -Math.random() * 12 + 1, 0.45 + Math.random() * 0.4);
        rainAt = time + 2.2 + Math.random() * 2.5;
      }
      render(dt);
    };

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = performance.now();
    });
    visibility.observe(container);

    // Follow theme changes
    const themeObserver = new MutationObserver(() => {
      applyTheme();
      if (reduceMotion) render(0);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    if (reduceMotion) {
      render(0);
    } else {
      addRipple(ringState.x, ringState.z + 0.4, 1.3);
      frame = requestAnimationFrame(loop);
    }
    onReady?.();

    return () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      source.removeEventListener('pointermove', onMove);
      source.removeEventListener('pointerleave', onLeave);
      source.removeEventListener('pointerdown', onDown);
      waterGeometry.dispose();
      waterMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      ringMap?.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [eventSource, onReady, onError]);

  return <div ref={mount} className="absolute inset-0" />;
};

export default WaterScene;
