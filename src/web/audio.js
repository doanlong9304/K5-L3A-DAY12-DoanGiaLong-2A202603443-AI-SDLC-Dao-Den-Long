// Tiny synthesized audio (WebAudio, no asset files): night ambience + short effects.
let ctx = null, master = null, musicNodes = null;
let volume = 0.6;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  return ctx;
}

export function setVolume(v) { volume = v; if (master) master.gain.value = v; }
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

function tone(freq, dur, { type = 'sine', gain = 0.25, slide = 0, delay = 0 } = {}) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  pick: () => tone(1200, 0.12, { gain: 0.15, slide: 400 }),
  lit: () => { tone(523, 0.4, { gain: 0.2 }); tone(659, 0.4, { gain: 0.2, delay: 0.12 }); tone(784, 0.6, { gain: 0.2, delay: 0.24 }); },
  pulse: () => tone(300, 0.5, { type: 'triangle', gain: 0.3, slide: 600 }),
  hit: () => tone(180, 0.35, { type: 'sawtooth', gain: 0.25, slide: -100 }),
  jump: () => tone(420, 0.15, { type: 'square', gain: 0.08, slide: 300 }),
  dash: () => tone(900, 0.18, { type: 'sawtooth', gain: 0.08, slide: -600 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, { gain: 0.2, delay: i * 0.15 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.6, { type: 'triangle', gain: 0.2, delay: i * 0.2 })),
  shade: () => tone(110, 0.7, { type: 'sawtooth', gain: 0.12, slide: -40 }),
  tick: () => tone(1000, 0.06, { type: 'square', gain: 0.08 }),
  wind: () => tone(200, 1.5, { type: 'triangle', gain: 0.06, slide: 120 }),
  steal: () => tone(700, 0.3, { type: 'triangle', gain: 0.15, slide: -500 }),
  charm: () => { tone(880, 0.2, { gain: 0.15 }); tone(1320, 0.3, { gain: 0.15, delay: 0.1 }); },
};

export function startMusic() {
  const c = ensure(); if (!c || musicNodes) return;
  const g = c.createGain(); g.gain.value = 0.05; g.connect(master);
  const oscs = [110, 164.8, 220].map((f, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 2;
    lfo.connect(lg).connect(o.frequency); lfo.start();
    o.connect(g); o.start();
    return [o, lfo];
  });
  musicNodes = { g, oscs };
}
export function stopMusic() {
  if (!musicNodes) return;
  for (const [o, l] of musicNodes.oscs) { o.stop(); l.stop(); }
  musicNodes.g.disconnect();
  musicNodes = null;
}
