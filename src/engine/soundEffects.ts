// Zero-dependency Web Audio synthesiser. Every sound is generated procedurally.
import type { Tier } from '../types/game';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
const listeners = new Set<(m: boolean) => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem('pd38_muted') === '1';
  } catch {
    return false;
  }
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('pd38_muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.02);
  listeners.forEach((l) => l(m));
}

export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ───────────────────────────── primitives ─────────────────────────────

function noiseBuffer(c: AudioContext, seconds: number, color: 'white' | 'pink' | 'brown' = 'white') {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'white') d[i] = w;
    else if (color === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else {
      b0 = 0.997 * b0 + w * 0.029591;
      b1 = 0.985 * b1 + w * 0.032534;
      b2 = 0.95 * b2 + w * 0.048056;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 2;
    }
  }
  return buf;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  start?: number;
  dur?: number;
  vol?: number;
  attack?: number;
  slideTo?: number;
  detune?: number;
  filter?: number;
}

function tone(o: ToneOpts) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + (o.start ?? 0);
  const dur = o.dur ?? 0.3;
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = c.createGain();
  const vol = o.vol ?? 0.2;
  const atk = o.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

interface NoiseOpts {
  start?: number;
  dur?: number;
  vol?: number;
  type?: BiquadFilterType;
  freq?: number;
  freqTo?: number;
  q?: number;
  color?: 'white' | 'pink' | 'brown';
  attack?: number;
}

function noise(o: NoiseOpts) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + (o.start ?? 0);
  const dur = o.dur ?? 0.3;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur + 0.05, o.color ?? 'white');
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 2000, t0);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function chord(freqs: number[], opts: Omit<ToneOpts, 'freq'>) {
  freqs.forEach((f, i) => tone({ ...opts, freq: f, detune: (i % 2 ? 6 : -6) }));
}

// ───────────────────────────── public sounds ─────────────────────────────

export const sfx = {
  unlock() {
    ac();
  },
  click() {
    tone({ freq: 880, type: 'triangle', dur: 0.06, vol: 0.12 });
  },
  hover() {
    tone({ freq: 2400 + Math.random() * 300, type: 'sine', dur: 0.03, vol: 0.05 });
  },
  select() {
    tone({ freq: 523, type: 'triangle', dur: 0.12, vol: 0.18 });
    tone({ freq: 784, type: 'triangle', start: 0.07, dur: 0.18, vol: 0.18 });
  },
  error() {
    tone({ freq: 180, type: 'square', dur: 0.18, vol: 0.08, filter: 900 });
  },
  /** Foil rip: a crackly filtered-noise sweep. */
  rip() {
    for (let i = 0; i < 7; i++) {
      noise({ start: i * 0.035, dur: 0.07, vol: 0.25, freq: 3000 + Math.random() * 3000, q: 2.5, type: 'bandpass' });
    }
    noise({ dur: 0.35, vol: 0.3, freq: 1200, freqTo: 6000, q: 0.7, type: 'highpass' });
  },
  /** Short tearing sound while dragging. */
  tearTick() {
    noise({ dur: 0.04, vol: 0.12, freq: 4000 + Math.random() * 2000, q: 3 });
  },
  flip() {
    noise({ dur: 0.22, vol: 0.18, freq: 600, freqTo: 3500, q: 0.8, type: 'bandpass', color: 'pink' });
  },
  slide() {
    noise({ dur: 0.18, vol: 0.1, freq: 1800, freqTo: 900, q: 1.2, color: 'pink' });
  },
  heartbeat() {
    tone({ freq: 55, type: 'sine', dur: 0.25, vol: 0.9, slideTo: 38 });
    tone({ freq: 50, type: 'sine', start: 0.22, dur: 0.3, vol: 0.7, slideTo: 34 });
  },
  /** The four graduated flashbang stingers. */
  stinger(tier: Tier) {
    switch (tier) {
      case 'STANDARD':
        noise({ dur: 0.25, vol: 0.18, freq: 2500, q: 0.6, type: 'highpass' });
        tone({ freq: 660, type: 'triangle', dur: 0.2, vol: 0.12 });
        break;
      case 'ELITE':
        chord([1046, 1318, 1568], { type: 'sine', dur: 0.8, vol: 0.09 });
        tone({ freq: 2093, type: 'triangle', start: 0.05, dur: 0.6, vol: 0.06 });
        noise({ dur: 0.5, vol: 0.12, freq: 6000, q: 4 });
        break;
      case 'RISING_WORLD':
        noise({ dur: 0.6, vol: 0.25, freq: 200, freqTo: 4000, q: 0.5, type: 'lowpass', color: 'pink', attack: 0.2 });
        chord([220, 277, 330, 440, 554], { type: 'sawtooth', dur: 1.6, vol: 0.06, attack: 0.25, filter: 2400 });
        chord([880, 1108], { type: 'sine', start: 0.3, dur: 1.2, vol: 0.06 });
        break;
      case 'PRIME_ICON':
        tone({ freq: 70, type: 'sine', dur: 1.4, vol: 0.9, slideTo: 30 });
        noise({ dur: 1.2, vol: 0.4, freq: 120, freqTo: 8000, q: 0.4, type: 'lowpass', color: 'brown', attack: 0.05 });
        chord([196, 247, 294, 392, 494, 587], { type: 'sawtooth', start: 0.05, dur: 2.4, vol: 0.06, attack: 0.15, filter: 3200 });
        [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, type: 'triangle', start: 0.3 + i * 0.09, dur: 0.9, vol: 0.08 }));
        break;
    }
  },
  /** Crowd roar for the prime walkout reveal. */
  roar() {
    noise({ dur: 2.8, vol: 0.35, freq: 900, q: 0.4, type: 'bandpass', color: 'pink', attack: 0.4 });
    noise({ dur: 2.2, vol: 0.2, freq: 2400, q: 0.6, type: 'bandpass', attack: 0.5 });
    sfx.fanfare();
  },
  fanfare() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    const times = [0, 0.14, 0.28, 0.42, 0.62, 0.76];
    notes.forEach((f, i) => {
      tone({ freq: f, type: 'square', start: times[i], dur: i === 5 ? 0.9 : 0.2, vol: 0.07, filter: 3000 });
      tone({ freq: f / 2, type: 'sawtooth', start: times[i], dur: i === 5 ? 0.9 : 0.2, vol: 0.05, filter: 1500 });
    });
  },
  goal(big = false) {
    // stadium horn + chime
    tone({ freq: 233, type: 'sawtooth', dur: big ? 1.2 : 0.7, vol: 0.12, filter: 1400, attack: 0.04 });
    tone({ freq: 311, type: 'sawtooth', dur: big ? 1.2 : 0.7, vol: 0.1, filter: 1400, attack: 0.04 });
    [1318, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'sine', start: 0.05 + i * 0.07, dur: 0.4, vol: 0.07 }));
    if (big) noise({ dur: 1.6, vol: 0.25, freq: 1000, q: 0.4, color: 'pink', attack: 0.2 });
  },
  concede() {
    tone({ freq: 220, type: 'triangle', dur: 0.35, vol: 0.1, slideTo: 150 });
  },
  whistle(long = false) {
    const blasts = long ? [0, 0.35, 0.7] : [0];
    blasts.forEach((s, i) => {
      const d = long && i === 2 ? 0.9 : 0.25;
      tone({ freq: 2800, type: 'sine', start: s, dur: d, vol: 0.12 });
      tone({ freq: 2950, type: 'sine', start: s, dur: d, vol: 0.08 });
      noise({ start: s, dur: d, vol: 0.05, freq: 2900, q: 8 });
    });
  },
  finalWhistle() {
    sfx.whistle(true);
    sfx.fanfare();
  },
  stamp() {
    tone({ freq: 90, type: 'sine', dur: 0.4, vol: 0.9, slideTo: 40 });
    noise({ dur: 0.18, vol: 0.4, freq: 500, q: 0.5, type: 'lowpass', color: 'brown' });
  },
  trophy() {
    chord([523, 659, 784, 1046], { type: 'triangle', dur: 2.2, vol: 0.08, attack: 0.05 });
    [1568, 2093, 2637, 3136].forEach((f, i) => tone({ freq: f, type: 'sine', start: 0.2 + i * 0.12, dur: 0.6, vol: 0.05 }));
  },
  sad() {
    [392, 370, 349, 262].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.32, dur: 0.5, vol: 0.12 }));
  },
  tension() {
    tone({ freq: 73, type: 'sawtooth', dur: 1.8, vol: 0.12, filter: 400, attack: 0.4 });
    tone({ freq: 77.8, type: 'sawtooth', dur: 1.8, vol: 0.1, filter: 400, attack: 0.4 });
    sfx.heartbeat();
  },
};
