// The home page's sounds, made on the fly (no audio files): underwater, the
// pool is muffled; above, the garden (waves on the rocks, a breeze,
// cicadas by day and crickets at night, a bird now and then). Silent until
// the visitor turns the sound on.

export const createSoundscape = () => {
  let ctx = null;
  let on = false;
  const nodes = {};

  const start = () => {
    ctx = new AudioContext();
    // Two seconds of soft noise, looped by every sound below
    const length = ctx.sampleRate * 2;
    const noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;
      data[i] = last * 6;
    }
    nodes.noise = noise;

    const loop = (frequency, type, q) => {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      source.playbackRate.value = 0.6 + Math.random() * 0.8;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      source.connect(filter);
      source.start(0, Math.random() * 2);
      return filter;
    };
    const wobble = (rate, depth, param, base) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = rate;
      gain.gain.value = depth;
      osc.connect(gain).connect(param);
      param.value = base;
      osc.start();
    };

    // The pool
    nodes.water = loop(900, 'lowpass', 0.7);
    nodes.waterGain = ctx.createGain();
    nodes.waterGain.gain.value = 0;
    nodes.water.connect(nodes.waterGain).connect(ctx.destination);

    // The garden
    nodes.garden = ctx.createGain();
    nodes.garden.gain.value = 0;
    nodes.garden.connect(ctx.destination);
    const sea = loop(500, 'lowpass', 0.4);
    const seaGain = ctx.createGain();
    wobble(0.11, 0.35, seaGain.gain, 0.45);
    sea.connect(seaGain).connect(nodes.garden);
    const wind = loop(1100, 'bandpass', 0.6);
    const windGain = ctx.createGain();
    wobble(0.07, 0.12, windGain.gain, 0.16);
    wind.connect(windGain).connect(nodes.garden);
    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 4600;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 4800;
    band.Q.value = 6;
    const pulse = ctx.createGain();
    wobble(32, 0.5, pulse.gain, 0.5);
    nodes.insects = ctx.createGain();
    nodes.insects.gain.value = 0;
    buzz.connect(band).connect(pulse).connect(nodes.insects).connect(nodes.garden);
    buzz.start();
    nodes.buzz = buzz;
  };

  const chirp = () => {
    const t = ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2200 + Math.random() * 1600;
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = t + i * 0.13;
      osc.frequency.setValueAtTime(base, t0);
      osc.frequency.exponentialRampToValueAtTime(base * 1.6, t0 + 0.05);
      osc.frequency.exponentialRampToValueAtTime(base * 0.9, t0 + 0.1);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.05, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
      osc.connect(gain).connect(nodes.garden);
      osc.start(t0);
      osc.stop(t0 + 0.12);
    }
  };

  return {
    get on() { return on; },

    toggle() {
      if (!ctx) start();
      on = !on;
      if (on) {
        ctx.resume();
      } else {
        nodes.waterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        nodes.garden.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
      return on;
    },

    // Every frame: which world we are in
    update(under, night, dt) {
      if (!on) return;
      const t = ctx.currentTime;
      nodes.water.frequency.setTargetAtTime(under ? 320 : 900, t, 0.15);
      nodes.waterGain.gain.setTargetAtTime(under ? 0.55 : 0.05, t, 0.2);
      nodes.garden.gain.setTargetAtTime(under ? 0 : 0.6, t, under ? 0.08 : 0.35);
      nodes.insects.gain.setTargetAtTime(night ? 0.035 : 0.022, t, 0.5);
      nodes.buzz.frequency.setTargetAtTime(night ? 3900 : 4600, t, 0.5);
      if (!under && !night && Math.random() < dt * 0.22) chirp();
    },

    // A bubble
    bloop(base = 380) {
      if (!on) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(base + Math.random() * 300, t);
      osc.frequency.exponentialRampToValueAtTime((base + 300) * 2.4, t + 0.09);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    },

    // Breaking the surface
    splash(big = true) {
      if (!on) return;
      const t = ctx.currentTime;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = nodes.noise;
      filter.type = 'bandpass';
      filter.frequency.value = big ? 900 : 1600;
      filter.Q.value = 0.6;
      gain.gain.setValueAtTime(big ? 1.4 : 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (big ? 1.1 : 0.6));
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(t, Math.random());
      source.stop(t + 1.2);
      const thump = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thump.frequency.setValueAtTime(110, t);
      thump.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      thumpGain.gain.setValueAtTime(big ? 0.5 : 0.2, t);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      thump.connect(thumpGain).connect(ctx.destination);
      thump.start(t);
      thump.stop(t + 0.4);
    },

    close() {
      ctx?.close();
      ctx = null;
      on = false;
    }
  };
};
