// Small toolkit for organic, hand-drawn-looking shapes in the portraits: smooth curves through points,
// edges made of tapered locks (hair) and lumpy clouds (curls), all varied per player by a seeded random.

export type P = [number, number];

const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: P) => `${r2(p[0])} ${r2(p[1])}`;

/** Seeded random numbers (mulberry32): the same player always gets the same shapes. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rand = ReturnType<typeof rng>;
export const between = (r: Rand, a: number, b: number) => a + (b - a) * r();

export const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const norm = (v: P): P => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/** Catmull-Rom segments ("C ...") from the current point pts[0] through the rest. */
export function smoothSegs(pts: P[], k = 1 / 6): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${pt([p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k])} ${pt([p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k])} ${pt(p2)}`;
  }
  return d;
}
export const smoothOpen = (pts: P[]) => `M ${pt(pts[0])}${smoothSegs(pts)}`;

/** A smooth closed shape through the points. */
export function smoothClosed(pts: P[], k = 1 / 6): string {
  const n = pts.length;
  let d = `M ${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C ${pt([p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k])} ${pt([p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k])} ${pt(p2)}`;
  }
  return `${d} Z`;
}

/**
 * Superellipse point (squarer than an ellipse, like a skull from the front). Angle in degrees, y down:
 * 270 is the top, 180 the left, 0/360 the right.
 */
export function squircle(cx: number, cy: number, rx: number, ry: number, deg: number, n = 2.7): P {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + rx * Math.sign(c) * Math.abs(c) ** (2 / n), cy + ry * Math.sign(s) * Math.abs(s) ** (2 / n)];
}

export interface LockOpts {
  /** Lock length range. */
  len: [number, number];
  /** Lean along the edge (+ towards the next valley), as a share of the length. */
  lean?: number;
  /** Where "outwards" is: away from this point. */
  from: P;
  /** Or a fixed outward direction (overrides `from`). */
  dir?: P;
  /** 0 = soft rounded locks, 1 = sharp spikes. */
  sharp?: number;
}

/**
 * Segments for an edge made of locks: starting at valleys[0] (the current point), each lock bulges
 * outwards to a tapered tip and comes back in to the next valley.
 */
export function lockSegs(valleys: P[], r: Rand, o: LockOpts): { d: string; tips: P[] } {
  let d = '';
  const tips: P[] = [];
  const sharp = o.sharp ?? 0.3;
  for (let i = 0; i < valleys.length - 1; i++) {
    const a = valleys[i];
    const b = valleys[i + 1];
    const mid = lerp(a, b, 0.5);
    const along = norm([b[0] - a[0], b[1] - a[1]]);
    const out = o.dir ? norm(o.dir) : norm([mid[0] - o.from[0], mid[1] - o.from[1]]);
    const len = between(r, o.len[0], o.len[1]);
    const lean = (o.lean ?? 0) + between(r, -0.12, 0.12);
    const tip: P = [mid[0] + out[0] * len + along[0] * lean * len, mid[1] + out[1] * len + along[1] * lean * len];
    tips.push(tip);
    // Flanks: the leading flank rises from the valley, the trailing one sweeps back in.
    const soft = 1 - sharp;
    const c1: P = [a[0] + out[0] * len * (0.55 + soft * 0.35), a[1] + out[1] * len * (0.55 + soft * 0.35)];
    const c2: P = [b[0] + out[0] * len * (0.25 + soft * 0.3) + along[0] * len * 0.1, b[1] + out[1] * len * (0.25 + soft * 0.3) + along[1] * len * 0.1];
    d += ` Q ${pt(c1)} ${pt(tip)} Q ${pt(c2)} ${pt(b)}`;
  }
  return { d, tips };
}

/** Points along the skull superellipse between two angles, with a little jitter in spacing. */
export function arcPoints(cx: number, cy: number, rx: number, ry: number, from: number, to: number, count: number, r: Rand, jitter = 0.25): P[] {
  const out: P[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const j = i === 0 || i === count ? 0 : between(r, -jitter, jitter) / count;
    out.push(squircle(cx, cy, rx, ry, from + (to - from) * (t + j)));
  }
  return out;
}

/** A lumpy cloud outline (curls, afros, buns): lobes of varied size around a superellipse. */
export function cloud(cx: number, cy: number, rx: number, ry: number, lobes: number, bump: number, r: Rand, from = 0, to = 360): string {
  const pts: P[] = [];
  const full = to - from >= 359;
  const steps = lobes * 2;
  for (let i = 0; i <= steps - (full ? 1 : 0); i++) {
    const deg = from + ((to - from) * i) / steps;
    const k = i % 2 === 0 ? 1 + bump * between(r, 0.7, 1.15) : 1 + bump * between(r, -0.05, 0.25);
    pts.push(squircle(cx, cy, rx * k, ry * k, deg, 2.3));
  }
  return full ? smoothClosed(pts, 0.2) : smoothOpen(pts);
}

/** A tapered strand / rope between two points with a bend (dreads, ponytails, flicks). */
export function taper(a: P, b: P, bend: number, w0: number, w1: number): string {
  const dir = norm([b[0] - a[0], b[1] - a[1]]);
  const nrm: P = [-dir[1], dir[0]];
  const mid: P = [(a[0] + b[0]) / 2 + nrm[0] * bend, (a[1] + b[1]) / 2 + nrm[1] * bend];
  const l0: P = [a[0] + nrm[0] * w0, a[1] + nrm[1] * w0];
  const r0: P = [a[0] - nrm[0] * w0, a[1] - nrm[1] * w0];
  const lm: P = [mid[0] + nrm[0] * (w0 + w1) * 0.5, mid[1] + nrm[1] * (w0 + w1) * 0.5];
  const rm: P = [mid[0] - nrm[0] * (w0 + w1) * 0.5, mid[1] - nrm[1] * (w0 + w1) * 0.5];
  const l1: P = [b[0] + nrm[0] * w1, b[1] + nrm[1] * w1];
  const r1: P = [b[0] - nrm[0] * w1, b[1] - nrm[1] * w1];
  return `M ${pt(l0)} Q ${pt(lm)} ${pt(l1)} Q ${pt([b[0] + dir[0] * w1, b[1] + dir[1] * w1])} ${pt(r1)} Q ${pt(rm)} ${pt(r0)} Z`;
}

export { pt };
