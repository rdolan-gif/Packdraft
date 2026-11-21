// "Toon" portraits: late-90s TV cartoon caricatures (the style the Google Flow grids were drawn in),
// built from vector parts on a 200×230 canvas. Big lopsided skulls, white eyes with dot pupils, big
// noses, laugh lines, thick navy ink, flat colours, plus an ink-wobble filter (and an optional "boil").
import { useId } from 'react';
import type { CaricatureTraits, HeadShape, KitDesign, SkinTone, HairColor } from '../types/game';
import { rng, between, smoothClosed, smoothOpen, smoothSegs, lockSegs, cloud, taper, squircle, pt, type P, type Rand } from '../components/portrait/organic';

const INK = '#161c2b';
const CX = 100;
const CY = 102; // widest point of the skull (cheekbones)
const W = 200;
const H = 252; // a deep chest so the kit shows on cards

const SKIN: Record<SkinTone, { base: string; shade: string; deep: string }> = {
  pale: { base: '#f6d3c0', shade: '#e6b29a', deep: '#c98d74' },
  freckled: { base: '#f6d3c0', shade: '#e6b29a', deep: '#c98d74' },
  light: { base: '#efc19c', shade: '#d9a07a', deep: '#b97f5b' },
  tan: { base: '#d6a274', shade: '#bb8256', deep: '#9b663f' },
  olive: { base: '#c48f60', shade: '#a6724a', deep: '#865734' },
  brown: { base: '#a86d43', shade: '#8b5531', deep: '#6c3f22' },
  dark: { base: '#804c2c', shade: '#673a20', deep: '#4d2a16' },
  deep: { base: '#5e3722', shade: '#4a2918', deep: '#341c10' },
};
const HAIR: Record<HairColor, { base: string; hi: string; brow: string }> = {
  black: { base: '#26211f', hi: '#443b36', brow: '#1d1a1f' },
  darkbrown: { base: '#3a2416', hi: '#5e3d27', brow: '#2d1b10' },
  brown: { base: '#6b4325', hi: '#8f6037', brow: '#4f301a' },
  blonde: { base: '#e2c37a', hi: '#f4e2aa', brow: '#b08a45' },
  ginger: { base: '#c7612d', hi: '#e58a55', brow: '#a24a1f' },
  grey: { base: '#9a9a9e', hi: '#c9c9cd', brow: '#6e6e72' },
  bleached: { base: '#f0e6be', hi: '#fffbea', brow: '#9a8256' },
};

interface Geo {
  rx: number;
  ry: number;
  n: number;
  jaw: number;
  jawY: number;
  chinY: number;
  chinW: number;
}
const GEO: Record<HeadShape, Geo> = {
  round: { rx: 57, ry: 66, n: 2.3, jaw: 45, jawY: 146, chinY: 170, chinW: 21 },
  oval: { rx: 51, ry: 70, n: 2.3, jaw: 38, jawY: 150, chinY: 176, chinW: 13 },
  square: { rx: 54, ry: 66, n: 3.0, jaw: 52, jawY: 156, chinY: 175, chinW: 27 },
  long: { rx: 46, ry: 80, n: 2.5, jaw: 37, jawY: 160, chinY: 186, chinW: 14 },
  heart: { rx: 58, ry: 68, n: 2.6, jaw: 33, jawY: 147, chinY: 175, chinW: 8 },
  flattop: { rx: 55, ry: 64, n: 3.8, jaw: 47, jawY: 152, chinY: 174, chinW: 20 },
  pear: { rx: 49, ry: 58, n: 2.2, jaw: 57, jawY: 154, chinY: 177, chinW: 30 },
  rugby: { rx: 53, ry: 76, n: 2.0, jaw: 36, jawY: 150, chinY: 181, chinW: 10 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const lum = (c: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/** Everything about one head: its outline and where the features sit. */
function build(g: Geo, r: Rand) {
  const crown = CY - g.ry;
  const eyeY = CY + 1;
  const nY = eyeY + (g.chinY - eyeY) * 0.4;
  const mY = eyeY + (g.chinY - eyeY) * 0.68;
  const tilt = between(r, -1.5, 1.5); // a little lopsided, like a caricature
  const half = (y: number) => {
    if (y <= CY) {
      const k = Math.min(1, Math.max(0, (CY - y) / g.ry));
      return g.rx * (1 - k ** g.n) ** (1 / g.n);
    }
    const pts: P[] = [[CY, g.rx], [g.jawY, g.jaw], [g.chinY - 5, g.chinW], [g.chinY, 0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [y0, x0] = pts[i];
      const [y1, x1] = pts[i + 1];
      if (y <= y1) {
        const t = (y - y0) / (y1 - y0);
        const e = i === 0 ? t ** 1.6 : t; // fuller cheeks
        return x0 + (x1 - x0) * e;
      }
    }
    return 0;
  };
  const upper: P[] = [];
  for (let d = 180; d <= 360; d += 15) upper.push(squircle(CX, CY, g.rx, g.ry, d, g.n));
  const right: P[] = [[CX + g.jaw + 1, g.jawY - 4], [CX + g.chinW + 3, g.chinY - 4]];
  const pts: P[] = [
    ...upper.slice(0, -1).map(([x, y]) => [x + (x > CX ? tilt : -tilt) * 0.3, y] as P),
    [CX + g.rx, CY],
    [CX + (g.rx + g.jaw) / 2 + 2, (CY + g.jawY) / 2 + 2],
    ...right,
    [CX, g.chinY],
    ...right.map(([x, y]) => [2 * CX - x, y + tilt * 0.4] as P).reverse(),
    [CX - (g.rx + g.jaw) / 2 - 2, (CY + g.jawY) / 2 + 2],
  ];
  return { crown, eyeY, nY, mY, half, face: smoothClosed(pts, 0.17), tilt };
}
type Head = ReturnType<typeof build>;

/** Angle on the skull superellipse where its edge reaches height y (left side). */
function sideDeg(g: Geo, y: number) {
  const k = Math.min(0.999, Math.max(0, (CY - y) / g.ry));
  return 180 + (Math.asin(k ** (g.n / 2)) * 180) / Math.PI;
}
function arc(g: Geo, ex: number, ey: number, fromY: number, steps = 12): P[] {
  const a = sideDeg({ ...g, rx: g.rx + ex, ry: g.ry + ey }, fromY);
  const out: P[] = [];
  for (let i = 0; i <= steps; i++) out.push(squircle(CX, CY, g.rx + ex, g.ry + ey, a + ((540 - 2 * a) * i) / steps, g.n));
  return out;
}

// ─────────────────────────────── hair ───────────────────────────────

interface HairOut {
  back?: string; // behind the head and shoulders
  front: { d: string; fill?: string; stroke?: boolean; width?: number; opacity?: number }[];
  lines?: string; // texture strokes on top
  hideEars?: boolean;
  bald?: boolean;
}

function hairline(g: Geo, h: Head, low: number, sideY: number, r: Rand, tuft: number, dirDown = true): { start: P; d: string } {
  // Right temple → forehead centre → left temple, as tufts pointing down (or a clean line).
  const hl = h.crown + g.ry * low;
  const xR = CX + h.half(sideY) + 1;
  const pts: P[] = [
    [xR, sideY],
    [CX + g.rx * 0.78, hl + (sideY - hl) * 0.45],
    [CX + g.rx * 0.42, hl + 3],
    [CX + between(r, -4, 4), hl],
    [CX - g.rx * 0.42, hl + 3],
    [CX - g.rx * 0.78, hl + (sideY - hl) * 0.45],
    [2 * CX - xR, sideY],
  ];
  if (tuft <= 0) return { start: pts[0], d: smoothSegs(pts) };
  const valleys: P[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const idx = t * (pts.length - 1);
    const a = pts[Math.floor(idx)];
    const b = pts[Math.min(pts.length - 1, Math.floor(idx) + 1)];
    const f = idx - Math.floor(idx);
    valleys.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - (i > 0 && i < n ? tuft * 0.6 : 0)]);
  }
  const { d } = lockSegs(valleys, r, { len: [tuft * 0.8, tuft * 1.4], dir: dirDown ? [0, 1] : [0, -1], lean: 0.25, sharp: 0.55 });
  return { start: pts[0], d };
}

function cap(g: Geo, h: Head, r: Rand, o: { ex: number; ey: number; sideY: number; low: number; tuft: number; spikes?: number; sharp?: number; lumpy?: number }): string {
  const outer = arc(g, o.ex, o.ey, o.sideY, 12);
  let top: string;
  if (o.spikes) {
    const { d } = lockSegs(outer, r, { len: [o.spikes * 0.7, o.spikes * 1.25], from: [CX, CY + 10], sharp: o.sharp ?? 0.9, lean: 0.15 });
    top = `M ${pt(outer[0])}${d}`;
  } else if (o.lumpy) {
    const { d } = lockSegs(outer, r, { len: [o.lumpy * 0.6, o.lumpy], from: [CX, CY + 10], sharp: 0.05 });
    top = `M ${pt(outer[0])}${d}`;
  } else top = `M ${pt(outer[0])}${smoothSegs(outer)}`;
  const front = hairline(g, h, o.low, o.sideY, r, o.tuft);
  return `${top} L ${pt(front.start)}${front.d} Z`;
}

function hair(t: CaricatureTraits, g: Geo, h: Head, r: Rand, col: { base: string; hi: string }, skin: { base: string; shade: string }): HairOut {
  const side = h.eyeY - 14;
  const base = col.base;
  const stubbleTone = mix(skin.base, base, 0.5);
  switch (t.hairStyle) {
    case 'bald':
      return { front: [], bald: true };
    case 'buzz':
      return { front: [{ d: cap(g, h, r, { ex: 1.5, ey: 1.5, sideY: side, low: 0.3, tuft: 0 }), fill: stubbleTone, width: 2.2 }] };
    case 'fade':
    case 'shavedline': {
      const hl = h.crown + g.ry * 0.27;
      const outer = arc(g, 1.5, 3, h.crown + g.ry * 0.46, 12);
      const L = outer[0];
      // Crisp line-up: a straight forehead line with squared-off temple corners.
      const top = `M ${pt(L)}${smoothSegs(outer)} L ${CX + g.rx * 0.82} ${hl + 3} L ${CX + g.rx * 0.6} ${hl} L ${CX - g.rx * 0.6} ${hl} L ${CX - g.rx * 0.82} ${hl + 3} Z`;
      const out: HairOut = {
        front: [
          { d: cap(g, h, r, { ex: 0.6, ey: 0.6, sideY: h.eyeY - 8, low: 0.27, tuft: 0 }), fill: mix(skin.base, base, 0.32), width: 0 },
          { d: top, fill: base, width: 2.6 },
        ],
      };
      if (t.hairStyle === 'shavedline') {
        const y = h.crown + g.ry * 0.38;
        out.lines = `M ${CX + g.rx * 0.5} ${y - 6} L ${CX + g.rx * 0.86} ${y + 10} M ${CX + g.rx * 0.56} ${y} L ${CX + g.rx * 0.82} ${y + 14}`;
      }
      return out;
    }
    case 'short':
      return { front: [{ d: cap(g, h, r, { ex: 3, ey: 6, sideY: side, low: 0.3, tuft: 5, lumpy: 4 }), fill: base }] };
    case 'receding': {
      const L = arc(g, 2.5, 3, side + 4, 12);
      const hl = h.crown + g.ry * 0.12;
      const d = `M ${pt(L[0])}${smoothSegs(L)} L ${pt([CX + g.rx * 0.82, side - 4])} Q ${CX + g.rx * 0.45} ${h.crown + g.ry * 0.42} ${CX + g.rx * 0.28} ${hl + 8} Q ${CX} ${hl - 2} ${CX - g.rx * 0.28} ${hl + 8} Q ${CX - g.rx * 0.45} ${h.crown + g.ry * 0.42} ${CX - g.rx * 0.82} ${side - 4} Z`;
      return { front: [{ d, fill: base }] };
    }
    case 'quiff':
    case 'slick':
    case 'sidepart':
    case 'flattop':
    case 'hightop':
    case 'manbun':
    case 'ponytail': {
      const ey = t.hairStyle === 'quiff' ? 10 : t.hairStyle === 'flattop' ? 16 : t.hairStyle === 'hightop' ? 34 : 6;
      const gg = t.hairStyle === 'flattop' || t.hairStyle === 'hightop' ? { ...g, n: 6, rx: g.rx - 2 } : g;
      const front: HairOut['front'] = [];
      if (t.hairStyle === 'hightop') front.push({ d: cap(g, h, r, { ex: 1.5, ey: 1.5, sideY: side + 6, low: 0.3, tuft: 0 }), fill: mix(skin.base, base, 0.4), width: 1.6 });
      const sideY = t.hairStyle === 'hightop' ? h.crown + g.ry * 0.4 : side;
      let d = cap(gg, h, r, { ex: 3, ey, sideY, low: t.hairStyle === 'slick' || t.hairStyle === 'ponytail' || t.hairStyle === 'manbun' ? 0.24 : 0.27, tuft: 0 });
      if (t.hairStyle === 'quiff') {
        const y = h.crown - ey;
        d = cap(g, h, r, { ex: 3, ey: 4, sideY, low: 0.26, tuft: 0 });
        front.push({ d: `M ${CX - g.rx * 0.6} ${h.crown + 14} C ${CX - g.rx * 0.6} ${y - 6} ${CX + g.rx * 0.2} ${y - 18} ${CX + g.rx * 0.62} ${y + 2} C ${CX + g.rx * 0.3} ${y} ${CX + g.rx * 0.05} ${y + 8} ${CX + g.rx * 0.2} ${h.crown + 18} Z`, fill: base });
      }
      front.unshift({ d, fill: base });
      let lines = '';
      if (t.hairStyle === 'slick' || t.hairStyle === 'ponytail' || t.hairStyle === 'manbun')
        for (const k of [-0.5, -0.15, 0.2, 0.5]) lines += ` M ${CX + g.rx * k} ${h.crown + g.ry * 0.25} Q ${CX + g.rx * k * 1.1} ${h.crown} ${CX + g.rx * k * 0.6} ${h.crown - 4}`;
      if (t.hairStyle === 'sidepart') {
        const px = CX - g.rx * 0.38;
        lines += ` M ${px} ${h.crown - 2} Q ${px - 2} ${h.crown + 8} ${px - 4} ${h.crown + g.ry * 0.22}`;
        front.push({ d: `M ${px} ${h.crown + 2} C ${CX + g.rx * 0.2} ${h.crown - 6} ${CX + g.rx * 0.85} ${h.crown + 6} ${CX + g.rx * 0.98} ${side} C ${CX + g.rx * 0.6} ${h.crown + g.ry * 0.36} ${CX} ${h.crown + g.ry * 0.3} ${px} ${h.crown + 10} Z`, fill: base });
      }
      if (t.hairStyle === 'manbun') front.unshift({ d: cloud(CX, h.crown - ey - 8, 15, 12, 6, 0.08, r), fill: base });
      const out: HairOut = { front, lines };
      if (t.hairStyle === 'ponytail') out.back = taper([CX - g.rx * 0.7, h.crown + 20], [CX - g.rx * 0.9, 212], 10, 9, 5);
      return out;
    }
    case 'fringe':
    case 'bowl': {
      const bowl = t.hairStyle === 'bowl';
      const outer = arc(g, bowl ? 7 : 4, bowl ? 8 : 6, bowl ? h.eyeY - 2 : side, 12);
      const by = h.eyeY - (bowl ? 16 : 19);
      const valleys: P[] = [];
      for (let i = 0; i <= 8; i++) valleys.push([outer[outer.length - 1][0] - ((outer[outer.length - 1][0] - outer[0][0]) * i) / 8, i === 0 || i === 8 ? outer[0][1] : by - 4]);
      const { d } = lockSegs(valleys, r, { len: [3, 6], dir: [0, 1], sharp: bowl ? 0.1 : 0.6 });
      return { front: [{ d: `M ${pt(outer[0])}${smoothSegs(outer)}${d} Z`, fill: base }], hideEars: bowl };
    }
    case 'curtains': {
      const outer = arc(g, 5, 7, h.eyeY - 4, 12);
      const R = outer[outer.length - 1];
      const L = outer[0];
      const d = `M ${pt(L)}${smoothSegs(outer)} C ${R[0] - 4} ${h.eyeY - 24} ${CX + 20} ${h.crown + 6} ${CX + 2} ${h.crown + 14} L ${CX - 2} ${h.crown + 14} C ${CX - 20} ${h.crown + 6} ${L[0] + 4} ${h.eyeY - 24} ${pt(L)} Z`;
      return { front: [{ d, fill: base }], lines: `M ${CX} ${h.crown - 6} L ${CX} ${h.crown + 13}`, hideEars: true };
    }
    case 'spiky':
    case 'gelled':
    case 'frosted': {
      const d = cap(g, h, r, { ex: 2, ey: 4, sideY: side, low: 0.28, tuft: 3, spikes: t.hairStyle === 'gelled' ? 9 : 13 });
      const out: HairOut = { front: [{ d, fill: base }] };
      if (t.hairStyle === 'frosted') out.front.push({ d, fill: '#f4e2a6', stroke: false });
      if (t.hairStyle === 'gelled') out.lines = [-0.4, 0, 0.4].map((k) => `M ${CX + g.rx * k} ${h.crown + 10} l ${2 + k * 6} -12`).join(' ');
      return out;
    }
    case 'mohawk': {
      const shaved = cap(g, h, r, { ex: 1.5, ey: 1.5, sideY: side + 6, low: 0.3, tuft: 0 });
      const crest: P[] = [];
      for (let i = 0; i <= 6; i++) crest.push([CX - 13 + i * 4.3, h.crown + 22 - Math.sin((i / 6) * Math.PI) * 4]);
      const { d } = lockSegs([[CX - 14, h.crown + 24], [CX - 10, h.crown + 4], [CX - 4, h.crown - 2], [CX + 4, h.crown - 2], [CX + 10, h.crown + 4], [CX + 14, h.crown + 24]], r, { len: [14, 22], dir: [0, -1], sharp: 1, lean: 0.1 });
      return { front: [{ d: shaved, fill: mix(skin.base, base, 0.35), width: 1.6 }, { d: `M ${CX - 14} ${h.crown + 24}${d} Z`, fill: base }] };
    }
    case 'curly':
    case 'twists': {
      if (t.hairStyle === 'twists') {
        const d = cap(g, h, r, { ex: 3, ey: 5, sideY: side, low: 0.28, tuft: 4, spikes: 11, sharp: 0.2 });
        return { front: [{ d, fill: base }], lines: arc(g, -4, -6, side + 4, 9).slice(1, -1).map(([x, y]) => `M ${x} ${y + 12} q 2 -6 0 -12`).join(' ') };
      }
      const d = cap(g, h, r, { ex: 6, ey: 9, sideY: side, low: 0.3, tuft: 4, lumpy: 7 });
      const curls = arc(g, -6, -4, side + 6, 10).slice(1, -1).map(([x, y], i) => `M ${x - 3} ${y + 10 + (i % 2) * 6} a 3 3 0 1 1 5 2`).join(' ');
      return { front: [{ d, fill: base }], lines: curls };
    }
    case 'afro': {
      const back = cloud(CX, h.crown + 30, g.rx + 26, g.ry * 0.55 + 24, 12, 0.09, r, 0, 360);
      const front = hairline(g, h, 0.32, h.eyeY - 6, r, 3);
      const out = arc(g, 0, 0, h.eyeY - 6, 10);
      return { back, front: [{ d: `M ${pt(out[0])}${smoothSegs(out)} L ${pt(front.start)}${front.d} Z`, fill: base, width: 0 }], hideEars: false };
    }
    case 'cornrows':
    case 'braids':
    case 'dreads': {
      const d = cap(g, h, r, { ex: 2.5, ey: 3, sideY: side, low: 0.27, tuft: 0 });
      const rows = [-0.55, -0.28, 0, 0.28, 0.55].map((k) => `M ${CX + g.rx * k * 0.8} ${h.crown + g.ry * 0.27} Q ${CX + g.rx * k * 1.05} ${h.crown + 4} ${CX + g.rx * k * 0.9} ${h.crown - 2}`).join(' ');
      const out: HairOut = { front: [{ d, fill: base }], lines: rows };
      if (t.hairStyle !== 'cornrows') {
        const dreads = t.hairStyle === 'dreads';
        const front: string[] = [];
        const back: string[] = [];
        for (const s of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const x0 = CX + s * (g.rx - 4 + i * 4);
            const end = (dreads ? g.jawY - 6 : g.jawY + 4) + i * 8 + between(r, -5, 5);
            front.push(taper([x0, side - 16 + i * 7], [x0 + s * (5 + i * 4), end], s * between(r, -3, 3), dreads ? 5.2 : 3.6, dreads ? 3.8 : 2.4));
          }
          for (let i = 0; i < 2; i++) {
            const x0 = CX + s * (g.rx * 0.55 + i * 10);
            back.push(taper([x0, h.crown + 30], [x0 + s * (14 + i * 6), g.chinY + 2 + i * 8], s * 4, dreads ? 5.5 : 3.8, dreads ? 4 : 2.6));
          }
        }
        out.back = back.join(' ');
        out.front.push(...front.map((sd) => ({ d: sd, fill: base, width: 2.2 })));
        if (dreads)
          out.lines = arc(g, -3, -4, side, 10)
            .slice(1, -1)
            .flatMap(([x, y]) => [0, 1].map((j) => `M ${x - 3} ${y + 6 + j * 9} q 3 2 6 0`))
            .join(' ');
        out.hideEars = false;
      }
      return out;
    }
    case 'long':
    case 'longwavy':
    case 'mullet': {
      const mullet = t.hairStyle === 'mullet';
      const wavy = t.hairStyle === 'longwavy';
      const bottom = mullet ? 198 : 214;
      const w = g.rx + (wavy ? 14 : 9);
      const back = `M ${CX - w} ${CY} C ${CX - w - 4} ${CY + 50} ${CX - w + 6} ${bottom - 10} ${CX - w + 10} ${bottom} L ${CX + w - 10} ${bottom} C ${CX + w - 6} ${bottom - 10} ${CX + w + 4} ${CY + 50} ${CX + w} ${CY} Z`;
      const front: HairOut['front'] = [];
      if (mullet) front.push({ d: cap(g, h, r, { ex: 3, ey: 6, sideY: side, low: 0.3, tuft: 5, lumpy: 4 }), fill: base });
      else {
        const outer = arc(g, 6, 7, h.eyeY + 4, 12);
        const L = outer[0];
        const R = outer[outer.length - 1];
        const ys = [bottom - 20, g.chinY, g.jawY, CY + 8, h.eyeY - 8];
        const inR = ys.map((y, i) => [CX + Math.max(h.half(y) + (i < 2 ? 2 : -3), 32) + (wavy && i % 2 ? 4 : 0), y] as P);
        const inL = inR.map(([x, y]) => [2 * CX - x, y] as P).reverse();
        const part: P = [CX, h.crown + g.ry * 0.14];
        const d = `M ${pt(L)}${smoothSegs(outer)} L ${R[0] + (wavy ? 6 : 0)} ${bottom - 14} L ${pt(inR[0])}${smoothSegs(inR)} Q ${CX + g.rx * 0.45} ${h.crown + g.ry * 0.16} ${pt(part)} Q ${CX - g.rx * 0.45} ${h.crown + g.ry * 0.16} ${pt(inL[0])}${smoothSegs(inL)} L ${L[0] - (wavy ? 6 : 0)} ${bottom - 14} Z`;
        front.push({ d, fill: base });
      }
      const strands = [-1, 1].flatMap((s) => [0, 1].map((i) => `M ${CX + s * (g.rx * 0.3 + i * 12)} ${h.crown + 4 + i * 6} Q ${CX + s * (g.rx + 2 + i * 3)} ${CY - 20} ${CX + s * (g.rx + 4 + i * 2)} ${bottom - 30 + i * 8}`)).join(' ');
      return { back, front, hideEars: !mullet, lines: mullet ? '' : `M ${CX} ${h.crown - 6} L ${CX} ${h.crown + 6} ${strands}` };
    }
    default:
      return { front: [{ d: cap(g, h, r, { ex: 3, ey: 6, sideY: side, low: 0.3, tuft: 5 }), fill: base }] };
  }
}

// ─────────────────────────────── face parts ───────────────────────────────

const ANGRY = new Set(['determined', 'roar', 'focused']);
const HAPPY = new Set(['grin', 'tongue', 'calm']);

function Eyes({ t, h, skin, browCol, r, uid }: { t: CaricatureTraits; h: Head; skin: { base: string; shade: string }; browCol: string; r: Rand; uid: string }) {
  const style = t.eyes ?? 'standard';
  const ex = t.expression;
  const angry = ANGRY.has(ex);
  const happy = HAPPY.has(ex);
  const heavy = style === 'heavy' || ex === 'cool';
  const y = h.eyeY;
  const gap = 21 + between(r, -1, 1.5);
  const look = between(r, -1.2, 1.2);
  const parts: JSX.Element[] = [];
  [-1, 1].forEach((s, i) => {
    const cx = CX + s * gap;
    const big = i === 0 ? 1 + between(r, 0, 0.08) : 1; // one eye a touch bigger
    let rx = 12.5 * big;
    let ry = 9.5 * big;
    if (style === 'wide') (rx = 13.5), (ry = 13.5);
    if (style === 'narrow') ry = 6.5;
    const key = `e${i}`;
    if (style === 'dot') {
      parts.push(<ellipse key={key} cx={cx + look} cy={y} rx={3.4} ry={4.2} fill={INK} />);
      parts.push(<path key={key + 'l'} d={`M ${cx - 6} ${y - 7} Q ${cx} ${y - 10} ${cx + 6} ${y - 7}`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />);
    } else {
      const clip = `${uid}-eye${i}`;
      // Lid cover: angry = slanted inward-down, heavy = half closed, happy = cheek pushes up from below.
      const lidY = heavy ? y - ry * 0.05 : style === 'narrow' ? y - ry * 0.4 : y - ry * 1.05;
      const inner = cx - s * rx;
      const outer = cx + s * rx;
      const lid = angry
        ? `M ${inner - s * 2} ${y - ry * 0.05} L ${outer + s * 2} ${y - ry * 0.75} L ${outer + s * 2} ${y - ry - 4} L ${inner - s * 2} ${y - ry - 4} Z`
        : `M ${cx - rx - 2} ${lidY} Q ${cx} ${lidY - (heavy ? 1.5 : 3)} ${cx + rx + 2} ${lidY} L ${cx + rx + 2} ${y - ry - 4} L ${cx - rx - 2} ${y - ry - 4} Z`;
      const lidLine = angry
        ? `M ${inner - s * 1.5} ${y - ry * 0.05} L ${outer + s * 2.5} ${y - ry * 0.8}`
        : `M ${cx - rx - 1.5} ${lidY + (heavy ? 0 : ry * 0.2)} Q ${cx} ${lidY - (heavy ? 1.5 : 3) - (heavy ? 0 : ry * 0.1)} ${cx + rx + 1.5} ${lidY + (heavy ? 0 : ry * 0.2)}`;
      parts.push(
        <g key={key}>
          <clipPath id={clip}>
            <ellipse cx={cx} cy={y} rx={rx} ry={ry} />
          </clipPath>
          <ellipse cx={cx} cy={y} rx={rx} ry={ry} fill="#fbf8f0" />
          <g clipPath={`url(#${clip})`}>
            <circle cx={cx + look - s * 1.2} cy={y + (heavy ? 1.6 : 0.6)} r={style === 'wide' ? 5 : 4.3} fill={INK} />
            {(heavy || angry || style === 'narrow') && <path d={lid} fill={skin.base} />}
            {happy && <path d={`M ${cx - rx - 2} ${y + ry + 2} Q ${cx} ${y + ry * 0.25} ${cx + rx + 2} ${y + ry + 2} Z`} fill={skin.base} />}
          </g>
          <ellipse cx={cx} cy={y} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={1.4} clipPath={`url(#${clip})`} />
          <path d={lidLine} stroke={INK} strokeWidth={2.8} fill="none" strokeLinecap="round" />
          {heavy && <path d={`M ${cx - rx * 0.7} ${y + ry + 2.5} Q ${cx} ${y + ry + 4.5} ${cx + rx * 0.7} ${y + ry + 2.5}`} stroke={skin.shade} strokeWidth={1.6} fill="none" strokeLinecap="round" />}
        </g>,
      );
    }
    // Brow: chunky tapered shape.
    const by = y - (style === 'wide' ? 20 : 16) - (ex === 'tongue' || ex === 'grin' ? 2 : 0);
    const inY = angry ? by + 6 : ex === 'tongue' ? by - 3 : by;
    const outY = angry ? by - 3 : by + 1;
    const ix = CX + s * (gap - 12);
    const ox = CX + s * (gap + 15);
    const th = 5.5;
    const d = `M ${ix} ${inY + th * 0.5} Q ${(ix + ox) / 2} ${Math.min(inY, outY) - 4 - th} ${ox} ${outY} Q ${(ix + ox) / 2} ${Math.min(inY, outY) - 2} ${ix} ${inY - th * 0.5} Z`;
    parts.push(<path key={key + 'b'} d={d} fill={browCol} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />);
  });
  return <g>{parts}</g>;
}

function Nose({ t, h, skin }: { t: CaricatureTraits; h: Head; skin: { shade: string } }) {
  const n = t.nose ?? 'standard';
  const y = h.nY;
  const top = h.eyeY + 6;
  const w = { standard: 10, button: 7.5, long: 10, bulbous: 13, hooked: 10 }[n];
  const tip = n === 'long' ? y + 6 : n === 'button' ? y - 4 : y;
  const bridge =
    n === 'hooked'
      ? `M ${CX + 3} ${top} C ${CX + 10} ${top + 10} ${CX + 14} ${tip - 8} ${CX + 6} ${tip + 2}`
      : n === 'long'
        ? `M ${CX + 2} ${top} C ${CX + 6} ${top + 16} ${CX + 9} ${tip - 10} ${CX + w - 1} ${tip - 2}`
        : `M ${CX + 3} ${top + 8} C ${CX + 5} ${tip - 10} ${CX + w} ${tip - 8} ${CX + w - 0.5} ${tip - 3}`;
  const bottom =
    n === 'bulbous'
      ? `M ${CX - w} ${tip - 2} C ${CX - w - 4} ${tip + 8} ${CX - 4} ${tip + 9} ${CX} ${tip + 6} C ${CX + 4} ${tip + 9} ${CX + w + 4} ${tip + 8} ${CX + w} ${tip - 2}`
      : `M ${CX - w} ${tip - 2} Q ${CX - w - 3} ${tip + 5} ${CX - w * 0.45} ${tip + 4.5} Q ${CX} ${tip + 8} ${CX + w * 0.45} ${tip + 4.5} Q ${CX + w + 3} ${tip + 5} ${CX + w} ${tip - 2}`;
  return (
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M ${CX - w + 1} ${tip - 4} Q ${CX + w * 0.2} ${tip + 9} ${CX + w + 1} ${tip - 4} L ${CX + w * 0.7} ${tip - 9} L ${CX - w * 0.5} ${tip - 9} Z`} fill={skin.shade} stroke="none" opacity={0.55} />
      <path d={bridge} strokeWidth={2.6} />
      <path d={bottom} strokeWidth={2.8} />
      <path d={`M ${CX - w * 0.42} ${tip + 3.4} q 1.5 -2 3 -0.3 M ${CX + w * 0.42} ${tip + 3.4} q -1.5 -2 -3 -0.3`} strokeWidth={1.8} />
    </g>
  );
}

function Mouth({ t, h, g, skin, uid }: { t: CaricatureTraits; h: Head; g: Geo; skin: { base: string; shade: string; deep: string }; uid: string }) {
  const y = h.mY;
  const ex = t.expression;
  const gap = t.detail === 'gaptooth';
  const w = Math.min(19, g.jaw * 0.42 + 3);
  const lip = mix(skin.deep, '#7a2b2b', 0.4);
  const laugh = (k: number) => (
    <path d={`M ${CX - 12} ${h.nY + 4} Q ${CX - w - 9} ${y - 6} ${CX - w - 4 - k} ${y + 4} M ${CX + 12} ${h.nY + 4} Q ${CX + w + 9} ${y - 6} ${CX + w + 4 + k} ${y + 4}`} stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" opacity={0.85} />
  );
  const chin = <path d={`M ${CX - 5} ${y + 13} Q ${CX} ${y + 15} ${CX + 5} ${y + 13}`} stroke={INK} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.7} />;
  const teeth = (x0: number, x1: number, y0: number, y1: number, n: number) => {
    const out: JSX.Element[] = [<path key="t" d={`M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`} fill="#fbf8f0" />];
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      out.push(<path key={i} d={`M ${x} ${y0} L ${x} ${y1}`} stroke={INK} strokeWidth={1} />);
    }
    if (gap) out.push(<rect key="g" x={CX - 1.6} y={y0} width={3.2} height={y1 - y0} fill="#3a1414" />);
    return out;
  };
  switch (ex) {
    case 'grin': {
      const d = `M ${CX - w - 3} ${y - 3} Q ${CX} ${y + 2} ${CX + w + 3} ${y - 3} Q ${CX + w} ${y + 13} ${CX} ${y + 13} Q ${CX - w} ${y + 13} ${CX - w - 3} ${y - 3} Z`;
      return (
        <g>
          {laugh(2)}
          <clipPath id={`${uid}-m`}>
            <path d={d} />
          </clipPath>
          <path d={d} fill="#4a1717" />
          <g clipPath={`url(#${uid}-m)`}>
            {teeth(CX - w - 3, CX + w + 3, y - 4, y + 4.5, 6)}
            <ellipse cx={CX} cy={y + 13} rx={7} ry={4} fill="#c95a5a" />
          </g>
          <path d={d} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        </g>
      );
    }
    case 'roar': {
      const d = `M ${CX - w - 2} ${y - 8} Q ${CX} ${y - 13} ${CX + w + 2} ${y - 8} Q ${CX + w + 5} ${y + 16} ${CX} ${y + 20} Q ${CX - w - 5} ${y + 16} ${CX - w - 2} ${y - 8} Z`;
      return (
        <g>
          {laugh(0)}
          <clipPath id={`${uid}-m`}>
            <path d={d} />
          </clipPath>
          <path d={d} fill="#4a1717" />
          <g clipPath={`url(#${uid}-m)`}>
            {teeth(CX - w - 4, CX + w + 4, y - 13, y - 4, 5)}
            <path d={`M ${CX - w} ${y + 21} L ${CX + w} ${y + 21} L ${CX + w} ${y + 13} L ${CX - w} ${y + 13} Z`} fill="#fbf8f0" />
            <ellipse cx={CX} cy={y + 11} rx={9} ry={4.5} fill="#c95a5a" />
          </g>
          <path d={d} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        </g>
      );
    }
    case 'tongue':
      return (
        <g>
          {laugh(0)}
          <path d={`M ${CX + 1} ${y + 2} q 1 10 7 9 q 6 -1 3 -10`} fill="#e07b7b" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d={`M ${CX + 5} ${y + 4} l 1.5 5`} stroke="#b54b4b" strokeWidth={1.2} />
          <path d={`M ${CX - w} ${y - 3} Q ${CX} ${y + 6} ${CX + w} ${y - 4}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'smirk':
      return (
        <g>
          <path d={`M ${CX + 12} ${h.nY + 4} Q ${CX + w + 9} ${y - 6} ${CX + w + 6} ${y + 1}`} stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" opacity={0.85} />
          <path d={`M ${CX - w + 2} ${y + 1} Q ${CX + 2} ${y + 5} ${CX + w + 2} ${y - 5}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d={`M ${CX + w + 1} ${y - 7} q 3 1 2.5 4`} stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d={`M ${CX - 5} ${y + 6} Q ${CX} ${y + 8} ${CX + 4} ${y + 5.5}`} stroke={lip} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {chin}
        </g>
      );
    case 'determined':
    case 'focused':
      return (
        <g>
          <path d={`M ${CX - 12} ${h.nY + 6} Q ${CX - w - 6} ${y - 4} ${CX - w - 3} ${y + 5} M ${CX + 12} ${h.nY + 6} Q ${CX + w + 6} ${y - 4} ${CX + w + 3} ${y + 5}`} stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.7} />
          <path d={`M ${CX - w + (ex === 'focused' ? 4 : 1)} ${y + 2} Q ${CX} ${y - 2.5} ${CX + w - (ex === 'focused' ? 4 : 1)} ${y + 2}`} stroke={INK} strokeWidth={2.7} fill="none" strokeLinecap="round" />
          <path d={`M ${CX - 5} ${y + 5.5} Q ${CX} ${y + 7} ${CX + 5} ${y + 5.5}`} stroke={lip} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {chin}
        </g>
      );
    case 'cool':
      return (
        <g>
          {laugh(-2)}
          <path d={`M ${CX - w + 3} ${y} Q ${CX} ${y + 4} ${CX + w - 1} ${y - 3}`} stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d={`M ${CX - 4} ${y + 5} Q ${CX} ${y + 6.5} ${CX + 4} ${y + 5}`} stroke={lip} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          {chin}
        </g>
      );
    default: // calm
      return (
        <g>
          {laugh(0)}
          <path d={`M ${CX - w} ${y - 2} Q ${CX} ${y + 8} ${CX + w} ${y - 2}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d={`M ${CX - w - 2} ${y - 4} q 2 1 2.5 3 M ${CX + w + 2} ${y - 4} q -2 1 -2.5 3`} stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {chin}
        </g>
      );
  }
}

function FacialHair({ t, g, h, col, skin, r, uid }: { t: CaricatureTraits; g: Geo; h: Head; col: { base: string }; skin: { base: string; shade: string }; r: Rand; uid: string }) {
  const f = t.facialHair;
  if (f === 'none') return null;
  const y = h.mY;
  const w = Math.min(19, g.jaw * 0.42 + 3);
  const base = col.base;
  const stache = `M ${CX - w - 5} ${y - 1} Q ${CX - w} ${h.nY + 5} ${CX - 4} ${h.nY + 8} Q ${CX} ${h.nY + 10} ${CX + 4} ${h.nY + 8} Q ${CX + w} ${h.nY + 5} ${CX + w + 5} ${y - 1} Q ${CX + w} ${y - 4} ${CX} ${y - 4} Q ${CX - w} ${y - 4} ${CX - w - 5} ${y - 1} Z`;
  if (f === 'stubble')
    return <path d={beardPath(g, h, r, 0, false)} fill={mix(skin.base, base, 0.28)} opacity={0.85} />;
  if (f === 'moustache') return <path d={stache} fill={base} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />;
  if (f === 'soulpatch') return <path d={`M ${CX - 3} ${y + 7} L ${CX + 3} ${y + 7} L ${CX} ${y + 13} Z`} fill={base} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />;
  if (f === 'goatee') {
    const chin = `M ${CX - w + 1} ${y + 5} Q ${CX} ${y + 9} ${CX + w - 1} ${y + 5} Q ${CX + w - 1} ${g.chinY - 6} ${CX + 2} ${g.chinY + 3} L ${CX} ${g.chinY + 6} L ${CX - 2} ${g.chinY + 3} Q ${CX - w + 1} ${g.chinY - 6} ${CX - w + 1} ${y + 5} Z`;
    return (
      <g fill={base} stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <path d={stache} />
        <path d={chin} />
      </g>
    );
  }
  const full = f === 'fullbeard';
  const strap = f === 'chinstrap';
  return (
    <g>
      <path d={beardPath(g, h, r, full ? 10 : strap ? 1 : 4, strap)} fill={base} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      {!strap && <path d={beardTicks(g, h, r, full ? 10 : 4)} stroke={mix(base, '#ffffff', 0.18)} strokeWidth={1.3} fill="none" strokeLinecap="round" />}
      {!strap && <ellipse cx={CX} cy={h.mY + 2} rx={w + 3} ry={t.expression === 'roar' ? 14 : 7} fill={skin.base} />}
      {!strap && <path d={stache} fill={base} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />}
      <clipPath id={`${uid}-mh`}>
        <rect x={0} y={0} width={W} height={H} />
      </clipPath>
    </g>
  );
}

/** The beard area: down the cheeks from the sideburns, under the jaw, with a hole round the mouth. */
function beardTicks(g: Geo, h: Head, r: Rand, drop: number) {
  let d = '';
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const y = h.eyeY + 14 + t * (g.jawY - h.eyeY - 6);
    for (const s of [-1, 1]) {
      const x = CX + s * (h.half(y) - 6);
      d += ` M ${x} ${y} l ${-s * between(r, 1, 3)} ${between(r, 3, 5)}`;
    }
  }
  for (let i = 0; i < 7; i++) d += ` M ${CX - 18 + i * 6} ${g.chinY - 4 + drop * 0.6} l ${between(r, -1, 1)} ${between(r, 3, 5)}`;
  return d;
}

function beardPath(g: Geo, h: Head, _r: Rand, drop: number, strap: boolean) {
  const top = h.eyeY + 8;
  const ys = [top, (top + g.jawY) / 2, g.jawY, (g.jawY + g.chinY) / 2];
  const outerR = ys.map((y) => [CX + h.half(y) + 1.5, y] as P);
  const outer: P[] = [...outerR, [CX + g.chinW + 5, g.chinY - 1 + drop * 0.7], [CX, g.chinY + 1 + drop], [CX - g.chinW - 5, g.chinY - 1 + drop * 0.7], ...outerR.map(([x, y]) => [2 * CX - x, y] as P).reverse()];
  const inner: P[] = strap
    ? [...ys.map((y) => [CX - h.half(y) + 8, y] as P), [CX - g.chinW, g.chinY - 7], [CX, g.chinY - 6], [CX + g.chinW, g.chinY - 7], ...ys.map((y) => [CX + h.half(y) - 8, y] as P).reverse()]
    : [[CX - h.half(top) + 8, top], [CX - h.half(h.nY) + 13, h.nY + 3], [CX - 24, h.nY + 8], [CX, h.nY + 6], [CX + 24, h.nY + 8], [CX + h.half(h.nY) - 13, h.nY + 3], [CX + h.half(top) - 8, top]];
  return `M ${pt(outer[0])}${smoothSegs(outer)} L ${pt(inner[0])}${smoothSegs(inner)} Z`;
}

// ─────────────────────────────── shirt ───────────────────────────────

function Shirt({ kit, uid }: { kit: KitDesign; uid: string }) {
  const nw = 27;
  const sy = 194;
  const neck =
    kit.collarStyle === 'v' ? `L ${CX} ${sy + 22} L ${CX + nw + 4} ${sy}` : kit.collarStyle === 'polo' ? `L ${CX} ${sy + 18} L ${CX + nw + 4} ${sy}` : `Q ${CX} ${sy + 18} ${CX + nw + 4} ${sy}`;
  const body = `M -4 ${H + 4} L -4 214 C 6 202 34 ${sy + 2} ${CX - nw - 4} ${sy} ${neck} C ${W - 34} ${sy + 2} ${W - 6} 202 ${W + 4} 214 L ${W + 4} ${H + 4} Z`;
  const clip = `${uid}-shirt`;
  const pc = kit.patternColor;
  const pat: JSX.Element[] = [];
  if (kit.pattern === 'stripes' || kit.pattern === 'pinstripes') {
    const n = kit.pattern === 'stripes' ? 7 : 16;
    for (let i = 0; i < n; i++) {
      const x = (W / n) * i + W / n / 2;
      pat.push(kit.pattern === 'stripes' ? <rect key={i} x={x - W / n / 4} y={180} width={W / n / 2} height={80} fill={pc} /> : <rect key={i} x={x} y={180} width={1.2} height={80} fill={pc} opacity={0.6} />);
    }
  } else if (kit.pattern === 'hoops') for (let i = 0; i < 4; i++) pat.push(<rect key={i} x={0} y={202 + i * 14} width={W} height={7} fill={pc} />);
  else if (kit.pattern === 'halves') pat.push(<rect key="h" x={CX} y={180} width={CX} height={80} fill={pc} />);
  else if (kit.pattern === 'sash') pat.push(<path key="s" d={`M 40 180 L 70 180 L 200 262 L 170 262 Z`} fill={pc} />);
  else if (kit.pattern === 'chestband') pat.push(<rect key="c" x={0} y={214} width={W} height={9} fill={pc} />);
  else if (kit.pattern === 'yoke') pat.push(<path key="y" d={`M 0 180 L ${W} 180 L ${W} 208 Q ${CX} 222 0 208 Z`} fill={pc} />);
  else if (kit.pattern === 'shadow') for (let i = -4; i < 10; i++) pat.push(<path key={i} d={`M ${i * 26} 262 L ${i * 26 + 54} 180 L ${i * 26 + 64} 180 L ${i * 26 + 10} 262 Z`} fill={pc} opacity={0.12} />);
  const collar =
    kit.collarStyle === 'polo' ? (
      <g fill={kit.collar} stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
        <path d={`M ${CX - nw - 6} ${sy - 2} L ${CX - 2} ${sy + 18} L ${CX - 16} ${sy + 24} L ${CX - nw - 14} ${sy + 6} Z`} />
        <path d={`M ${CX + nw + 6} ${sy - 2} L ${CX + 2} ${sy + 18} L ${CX + 16} ${sy + 24} L ${CX + nw + 14} ${sy + 6} Z`} />
        <circle cx={CX} cy={sy + 26} r={1.6} fill={INK} stroke="none" />
      </g>
    ) : (
      <path d={`M ${CX - nw - 4} ${sy} ${neck}`} fill="none" stroke={kit.collar} strokeWidth={5.5} strokeLinejoin="round" />
    );
  return (
    <g>
      <clipPath id={clip}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={kit.body} />
      <g clipPath={`url(#${clip})`}>
        {pat}
        <path d={`M -4 206 C 20 200 34 200 46 ${sy + 2} L 36 ${H + 4} L -4 ${H + 4} Z M ${W + 4} 206 C ${W - 20} 200 ${W - 34} 200 ${W - 46} ${sy + 2} L ${W - 36} ${H + 4} L ${W + 4} ${H + 4} Z`} fill={kit.sleeve} />
        <path d={`M 46 ${sy + 2} L 36 ${H + 4} M ${W - 46} ${sy + 2} L ${W - 36} ${H + 4}`} stroke={kit.piping ? kit.trim : INK} strokeWidth={kit.piping ? 3 : 1.4} opacity={kit.piping ? 1 : 0.5} />
        <path d={`M -4 ${H - 6} Q ${CX} ${H - 14} ${W + 4} ${H - 6} L ${W + 4} ${H + 4} L -4 ${H + 4} Z`} fill="#000" opacity={0.12} />
      </g>
      {collar}
      <path d={body} fill="none" stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />
      {/* our own badge and maker mark (never real ones) */}
      <g transform={`translate(${CX + 40} 208)`} stroke={INK} strokeWidth={1.3}>
        {kit.badge.shape === 'round' ? <circle r={6} fill={kit.badge.fill} /> : <path d="M -6 -6 L 6 -6 L 6 1 Q 6 6 0 8 Q -6 6 -6 1 Z" fill={kit.badge.fill} />}
        <path d="M -5 -1 L 5 -1" stroke={kit.badge.band} strokeWidth={2.4} />
      </g>
      <g transform={`translate(${CX - 40} 208)`} fill={kit.maker.color}>
        {kit.maker.mark === 'chevron' ? <path d="M -5 -2 L 0 2 L 5 -2 L 5 1 L 0 5 L -5 1 Z" /> : kit.maker.mark === 'bars' ? <path d="M -5 -3 h10 v2 h-10 Z M -5 1 h10 v2 h-10 Z" /> : kit.maker.mark === 'diamond' ? <path d="M 0 -4 L 4 0 L 0 4 L -4 0 Z" /> : <circle r={2.6} />}
      </g>
    </g>
  );
}

// ─────────────────────────────── the portrait ───────────────────────────────

export interface ToonProps {
  traits: CaricatureTraits;
  kit: KitDesign;
  seed: string;
  size?: number;
  /** Ink wobble strength (0 = off). */
  wobble?: number;
  /** Animate the wobble ("Squigglevision" boil). */
  boil?: boolean;
  className?: string;
}

export function Toon({ traits: t, kit, seed, size = 200, wobble = 1.8, boil = false, className }: ToonProps) {
  const uid = useId().replace(/:/g, '');
  const h0 = hash(seed);
  const r = rng(h0);
  const g = GEO[t.headShape];
  const head = build(g, r);
  const skin = SKIN[t.skinTone];
  const col = HAIR[t.hairColor];
  const hr = hair(t, g, head, rng(h0 + 1), col, skin);
  const browCol = t.hairStyle === 'bald' && t.hairColor === 'black' ? mix(skin.deep, '#1d1a1f', 0.5) : col.brow;
  const neckW = Math.max(23, Math.min(31, g.jaw * 0.62));
  const earY = head.eyeY - 9;
  const earX = head.half(earY + 8);
  const acc = t.accessory;
  const det = t.detail ?? 'none';
  const filter = wobble > 0 ? `url(#${uid}-wob)` : undefined;

  const ear = (s: number) => {
    const x = CX + s * (earX - 3);
    const d = `M ${x} ${earY} C ${x + s * 16} ${earY - 8} ${x + s * 20} ${earY + 14} ${x + s * 14} ${earY + 27} C ${x + s * 10} ${earY + 34} ${x + s * 3} ${earY + 34} ${x} ${earY + 29} Z`;
    return (
      <g key={s}>
        <path d={d} fill={skin.base} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d={`M ${x + s * 4} ${earY + 6} C ${x + s * 13} ${earY + 3} ${x + s * 14} ${earY + 16} ${x + s * 7} ${earY + 21}`} stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} className={className} aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        {wobble > 0 && (
          <filter id={`${uid}-wob`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={h0 % 50}>
              {boil && <animate attributeName="seed" values={`${h0 % 50};${(h0 % 50) + 1};${(h0 % 50) + 2}`} dur="0.42s" calcMode="discrete" repeatCount="indefinite" />}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale={wobble} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
        <clipPath id={`${uid}-face`}>
          <path d={head.face} />
        </clipPath>
      </defs>
      <g filter={filter}>
        {hr.back && <path d={hr.back} fill={col.base} stroke={INK} strokeWidth={3} strokeLinejoin="round" />}
        {/* neck: goes down inside the collar */}
        <path d={`M ${CX - neckW} ${g.jawY - 14} L ${CX - neckW - 2} 214 L ${CX + neckW + 2} 214 L ${CX + neckW} ${g.jawY - 14} Z`} fill={skin.base} stroke={INK} strokeWidth={3} />
        <path d={`M ${CX - neckW} ${g.chinY - 12} Q ${CX} ${g.chinY + 22} ${CX + neckW} ${g.chinY - 12} L ${CX + neckW} ${g.chinY + 4} Q ${CX} ${g.chinY + 26} ${CX - neckW} ${g.chinY + 4} Z`} fill={skin.shade} />
        {acc === 'snood' && <path d={`M ${CX - neckW - 6} ${g.chinY + 2} Q ${CX} ${g.chinY + 10} ${CX + neckW + 6} ${g.chinY + 2} L ${CX + neckW + 8} 210 L ${CX - neckW - 8} 210 Z`} fill="#1f2937" stroke={INK} strokeWidth={2.6} />}
        <Shirt kit={kit} uid={uid} />
        {acc === 'captainband' && <path d="M 10 214 L 34 206 L 38 218 L 14 226 Z" fill="#facc15" stroke={INK} strokeWidth={2} />}
        {[-1, 1].map(ear)}
        <path d={head.face} fill={skin.shade} />
        {/* flat cel shade: a crescent down the left side and under the jaw */}
        <g clipPath={`url(#${uid}-face)`}>
          <path d={head.face} fill={skin.base} transform="translate(6 -5)" />
          {t.skinTone === 'freckled' &&
            [-1, 1].flatMap((s) => [0, 1, 2, 3, 4].map((i) => <circle key={`${s}${i}`} cx={CX + s * (14 + (i % 3) * 5)} cy={head.nY - 6 + Math.floor(i / 2) * 4 + (i % 2) * 2} r={1.1} fill={skin.deep} opacity={0.7} />))}
          {det === 'blackeye' && <ellipse cx={CX + 19} cy={head.eyeY + 2} rx={15} ry={12} fill="#6b4a8a" opacity={0.45} />}
        </g>
        {/* cheekbone ticks */}
        <path d={`M ${CX - 30} ${head.eyeY + 16} q 4 3 8 2 M ${CX + 30} ${head.eyeY + 16} q -4 3 -8 2`} stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.55} />
        <FacialHair t={t} g={g} h={head} col={col} skin={skin} r={rng(h0 + 2)} uid={uid} />
        <Eyes t={t} h={head} skin={skin} browCol={browCol} r={rng(h0 + 3)} uid={uid} />
        <Nose t={t} h={head} skin={skin} />
        <Mouth t={t} h={head} g={g} skin={skin} uid={uid} />
        {t.facialHair === 'stubble' && null}
        <path d={head.face} fill="none" stroke={INK} strokeWidth={3.6} strokeLinejoin="round" />
        {hr.bald && <path d={`M ${CX - 22} ${head.crown + 12} Q ${CX - 6} ${head.crown + 3} ${CX + 8} ${head.crown + 6}`} stroke="#fff" strokeWidth={4} opacity={0.35} fill="none" strokeLinecap="round" />}
        {hr.front.map((p, i) => (
          <path key={i} d={p.d} fill={p.fill ?? col.base} stroke={p.stroke === false || p.width === 0 ? 'none' : INK} strokeWidth={p.width ?? 3} strokeLinejoin="round" opacity={p.opacity} clipPath={p.stroke === false ? `url(#${uid}-frost)` : undefined} />
        ))}
        <clipPath id={`${uid}-frost`}>
          <rect x={0} y={0} width={W} height={head.crown + 4} />
        </clipPath>
        {hr.lines && <path d={hr.lines} stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.75} />}
        {/* accessories and details */}
        {(acc === 'headband' || acc === 'sweatband' || acc === 'bandage') && (
          <path
            d={`M ${CX - head.half(head.crown + g.ry * 0.3) - 3} ${head.crown + g.ry * 0.3 + 3} Q ${CX} ${head.crown + g.ry * 0.3 - 10} ${CX + head.half(head.crown + g.ry * 0.3) + 3} ${head.crown + g.ry * 0.3 + 3}`}
            stroke={acc === 'headband' ? '#2b3550' : acc === 'bandage' ? '#f4f1ea' : '#f4f1ea'}
            strokeWidth={acc === 'headband' ? 5 : 12}
            fill="none"
          />
        )}
        {acc === 'bandage' && <circle cx={CX + 16} cy={head.crown + g.ry * 0.3 - 3} r={3} fill="#c2410c" opacity={0.7} />}
        {acc === 'alice' && <path d={`M ${CX - g.rx - 2} ${head.crown + g.ry * 0.42} Q ${CX} ${head.crown - 4} ${CX + g.rx + 2} ${head.crown + g.ry * 0.42}`} stroke={INK} strokeWidth={3.4} fill="none" />}
        {acc === 'earring' && <circle cx={CX - earX - 4} cy={earY + 25} r={2.6} fill="#f5c542" stroke={INK} strokeWidth={1.2} />}
        {acc === 'goggles' && (
          <g stroke={INK} strokeWidth={2.6} fill="#9fd4ec" fillOpacity={0.45}>
            <path d={`M ${CX - g.rx} ${head.eyeY - 4} L ${CX + g.rx} ${head.eyeY - 4}`} strokeWidth={4} />
            <rect x={CX - 34} y={head.eyeY - 12} width={30} height={22} rx={9} />
            <rect x={CX + 4} y={head.eyeY - 12} width={30} height={22} rx={9} />
          </g>
        )}
        {acc === 'facemask' && <path d={`M ${CX - 36} ${head.eyeY - 14} L ${CX + 36} ${head.eyeY - 14} L ${CX + 30} ${head.nY + 10} L ${CX} ${head.nY + 14} L ${CX - 30} ${head.nY + 10} Z`} fill="#bfe3f5" fillOpacity={0.35} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />}
        {acc === 'scrumcap' && <path d={smoothOpen(arc(g, 7, 9, head.eyeY + 6, 10)) + ` Q ${CX} ${head.crown + g.ry * 0.3} ${CX - g.rx - 7} ${head.eyeY + 6}`} fill="#1f2937" stroke={INK} strokeWidth={3} />}
        {det === 'plaster' && (
          <g transform={`translate(${CX + 30} ${head.nY - 2}) rotate(-30)`} stroke={INK} strokeWidth={1.4}>
            <rect x={-10} y={-4} width={20} height={8} rx={2} fill="#e8b98a" />
            <rect x={-4} y={-10} width={8} height={20} rx={2} fill="#e8b98a" />
          </g>
        )}
        {det === 'nosestrip' && <rect x={CX - 11} y={head.eyeY + 13} width={22} height={7} rx={2} fill="#f4f1ea" stroke={INK} strokeWidth={1.4} />}
        {det === 'scar' && <path d={`M ${CX + 26} ${head.eyeY - 24} L ${CX + 18} ${head.eyeY - 6} M ${CX + 20} ${head.eyeY - 19} l 5 2 M ${CX + 23} ${head.eyeY - 13} l -5 -2`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />}
      </g>
    </svg>
  );
}

export { taper };
