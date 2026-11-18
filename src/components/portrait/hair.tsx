import type { ReactNode } from 'react';
import type { HairStyle } from '../../types/game';
import { arcPoints, between, cloud, lerp, lockSegs, pt, rng, smoothClosed, smoothSegs, squircle, taper, type P, type Rand } from './organic';

// Organic hair: every style is a mass whose edges are made of locks (tapered, leaning, varied per
// player), shaded in the brand's flat style: a hard-edged shadow tone on the underside, a highlight
// shape on the crown, a few flow lines, and one ink outline.

export interface Geo {
  t: number;
  w: number;
  j: number;
  c: number;
  m: number;
}

export interface HairTone {
  base: string;
  hi: string;
  sh: string;
  flow: string;
}

export interface HairCtx {
  g: Geo;
  tone: HairTone;
  style: HairStyle;
  seed: number;
  uid: string;
  ink: string;
  frost: string;
  skinShade: string;
}

interface MassOpts {
  thick: number;
  lift: number;
  locks: number;
  len: [number, number];
  lean?: number;
  sharp?: number;
  /** Hairline height at the centre, down from the top of the skull. */
  hairline: number;
  /** How far the hair comes down the sides, relative to the head's widest point. */
  sideDown?: number;
  sideburn?: boolean;
  /** Locks hanging over the forehead. */
  fringe?: { count: number; len: [number, number]; lean?: number };
  /** A custom hairline (right temple to left temple). */
  line?: P[];
  from?: number;
  to?: number;
}

const INK_W = 0.9;

/** The outline of a hair mass and where its lock tips ended up. */
function massPath(g: Geo, r: Rand, o: MassOpts): { d: string; tips: P[]; line: P[] } {
  const cx = 50;
  const cy = g.m;
  const rx = g.w + o.thick;
  const ry = g.m - g.t + o.thick * 0.55 + o.lift;
  const from = o.from ?? 186;
  const to = o.to ?? 354;
  const sd = o.sideDown ?? -2;
  const sideL: P = [cx - g.w - o.thick * 0.45, cy + sd];
  const sideR: P = [cx + g.w + o.thick * 0.45, cy + sd];

  const valleys = o.locks > 0 ? arcPoints(cx, cy, rx, ry, from, to, o.locks, r) : [];
  const outer = o.locks > 0 ? lockSegs(valleys, r, { len: o.len, lean: o.lean ?? 0.2, from: [cx, cy + 6], sharp: o.sharp }) : { d: '', tips: [] as P[] };

  const hl = o.hairline;
  const line: P[] = o.line ?? [
    [cx + g.w * 0.86, g.t + hl + 7],
    [cx + g.w * 0.55, g.t + hl + 1.5],
    [cx + g.w * 0.18, g.t + hl + between(r, -0.6, 0.6)],
    [cx - g.w * 0.2, g.t + hl + between(r, -0.6, 0.6)],
    [cx - g.w * 0.56, g.t + hl + 1.5],
    [cx - g.w * 0.86, g.t + hl + 7],
  ];

  let d = `M ${pt(sideL)}`;
  if (o.locks > 0) {
    d += smoothSegs([sideL, lerp(sideL, valleys[0], 0.5), valleys[0]]);
    d += outer.d;
    d += smoothSegs([valleys[valleys.length - 1], lerp(valleys[valleys.length - 1], sideR, 0.5), sideR]);
  } else {
    d += smoothSegs([sideL, ...arcPoints(cx, cy, rx, ry, from, to, 10, r, 0), sideR]);
  }

  // Inner edge: the right sideburn, up to the hairline, across (or as a fringe), down the left side.
  const burnR: P[] = o.sideburn ? [[cx + g.w - 0.4, cy + sd + 3.5], [cx + g.w - 2.6, cy + sd + 3]] : [[cx + g.w - 1.2, cy + sd + 0.5]];
  const burnL: P[] = o.sideburn ? [[cx - g.w + 2.6, cy + sd + 3], [cx - g.w + 0.4, cy + sd + 3.5]] : [[cx - g.w + 1.2, cy + sd + 0.5]];
  if (o.fringe) {
    const start = line[0];
    const end = line[line.length - 1];
    d += smoothSegs([sideR, ...burnR, start]);
    const fv: P[] = [];
    for (let i = 0; i <= o.fringe.count; i++) {
      const t = i / o.fringe.count;
      const k = Math.min(line.length - 1.0001, t * (line.length - 1));
      const a = line[Math.floor(k)];
      const b = line[Math.floor(k) + 1];
      fv.push(lerp(a, b, k - Math.floor(k)));
    }
    d += lockSegs(fv, r, { len: o.fringe.len, lean: o.fringe.lean ?? 0.3, from: [cx, g.t - 20], dir: [0.12, 1], sharp: 0.55 }).d;
    d += smoothSegs([end, ...burnL, sideL]);
  } else {
    d += smoothSegs([sideR, ...burnR, ...line, ...burnL, sideL]);
  }
  return { d: `${d} Z`, tips: outer.tips, line };
}

/** Fill a hair shape with the brand's cel shading: shadow tone, base offset up-left, highlight, flow, outline. */
function Shaded({ id, d, tone, ink, sheen, flow, extra, outline = true }: { id: string; d: string; tone: HairTone; ink: string; sheen?: string; flow?: string[]; extra?: ReactNode; outline?: boolean }) {
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={tone.sh} />
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={tone.base} transform="translate(-1.4 -2)" />
        {sheen && <path d={sheen} fill={tone.hi} />}
        {flow?.map((f, i) => <path key={i} d={f} fill="none" stroke={tone.flow} strokeWidth="0.65" strokeLinecap="round" opacity="0.85" />)}
        {extra}
      </g>
      {outline && <path d={d} fill="none" stroke={ink} strokeWidth={INK_W} strokeLinejoin="round" />}
    </g>
  );
}

/** A highlight lens across the crown (light from the upper left). */
function sheenPath(g: Geo, r: Rand, o: { thick: number; lift: number; from?: number; to?: number; depth?: number }): string {
  const cx = 50;
  const cy = g.m;
  const rx = g.w + o.thick;
  const ry = g.m - g.t + o.thick * 0.55 + o.lift;
  const a0 = o.from ?? 214;
  const a1 = o.to ?? 292;
  const depth = o.depth ?? 0.8;
  const top: P[] = [];
  const bottom: P[] = [];
  for (let i = 0; i <= 5; i++) {
    const deg = a0 + ((a1 - a0) * i) / 5;
    const bulge = Math.sin((Math.PI * i) / 5);
    top.push(squircle(cx, cy, rx * (0.92 - 0.04 * bulge), ry * (0.92 - 0.04 * bulge), deg));
    bottom.push(squircle(cx, cy, rx * (0.92 - (1 - depth) * bulge * 1.2 - 0.06 * bulge), ry * (0.92 - (1 - depth) * bulge * 1.3 - 0.07 * bulge + between(r, -0.02, 0.02)), deg));
  }
  return smoothClosed([...top, ...bottom.reverse()], 0.18);
}

/** Flow lines: short strokes from lock tips back towards the crown. */
function flowFromTips(tips: P[], g: Geo, r: Rand, every = 2, reach = 0.45): string[] {
  const target: P = [50, g.t + 12];
  return tips
    .filter((_, i) => i % every === 0)
    .map((tip) => {
      const end = lerp(tip, target, reach * between(r, 0.7, 1.1));
      const mid = lerp(tip, end, 0.5);
      return `M ${pt(tip)} Q ${pt([mid[0] + between(r, -1.2, 1.2), mid[1] + between(r, -1, 1)])} ${pt(end)}`;
    });
}

/** Fine texture for clipped hair (buzz, shaved sides): tiny strokes in the growth direction. */
function grain(g: Geo, r: Rand, n: number, to: number, side = 0): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = 50 + between(r, -g.w * 0.95, g.w * 0.95);
    const yTop = g.t + Math.abs(x - 50) ** 2 / (g.w * g.w) * 9;
    const y = between(r, yTop, g.t + to + (Math.abs(x - 50) / g.w) * side);
    const dx = (x - 50) * 0.04;
    out.push(`M ${pt([x, y])} l ${dx.toFixed(2)} -0.9`);
  }
  return out;
}

export function hairLayers(ctx: HairCtx): { back: ReactNode; front: ReactNode; foreheadShadow: boolean } {
  const { g, tone, style, uid, ink, frost } = ctx;
  const r = rng(ctx.seed ^ (style.length * 2654435761));
  const id = (k: string) => `${uid}-${k}`;

  const mass = (o: MassOpts) => massPath(g, r, o);
  const shadedMass = (o: MassOpts, opts: { sheen?: boolean; flowEvery?: number; extra?: (m: ReturnType<typeof massPath>) => ReactNode; key?: string } = {}) => {
    const m = mass(o);
    return (
      <Shaded
        key={opts.key}
        id={id(opts.key ?? 'm')}
        d={m.d}
        tone={tone}
        ink={ink}
        sheen={opts.sheen === false ? undefined : sheenPath(g, r, { thick: o.thick, lift: o.lift })}
        flow={opts.flowEvery ? flowFromTips(m.tips, g, r, opts.flowEvery) : undefined}
        extra={opts.extra?.(m)}
      />
    );
  };

  // Shaved/clipped hair: a thin flat cap with grain, no locks.
  const clipped = (to: number, density: number, line?: P[], key = 'c', alpha = 0.9) => {
    const m = mass({ thick: 0.5, lift: 0.4, locks: 0, len: [0, 0], hairline: to, sideDown: -2.5, sideburn: true, line });
    return (
      <g key={key}>
        <clipPath id={id(key)}>
          <path d={m.d} />
        </clipPath>
        <path d={m.d} fill={tone.base} opacity={alpha} />
        <g clipPath={`url(#${id(key)})`}>
          {grain(g, r, density, to + 6, 6).map((d, i) => (
            <path key={i} d={d} stroke={tone.flow} strokeWidth="0.55" strokeLinecap="round" opacity="0.8" />
          ))}
          <path d={sheenPath(g, r, { thick: 0.5, lift: 0.4, depth: 0.9 })} fill={tone.hi} opacity="0.35" />
        </g>
      </g>
    );
  };

  // Lumpy cloud hair (curly, afro): bumps instead of locks, with little curl marks.
  const curls = (cx: number, cy: number, rx: number, ry: number, n: number, key: string) => {
    const out: ReactNode[] = [];
    for (let i = 0; i < n; i++) {
      const a = between(r, 200, 340);
      const k = between(r, 0.25, 0.85);
      const p = squircle(cx, cy, rx * k, ry * k, a);
      const s = between(r, 1.2, 2);
      out.push(<path key={`${key}${i}`} d={`M ${pt([p[0] - s, p[1]])} a ${s} ${s * 0.9} 0 1 1 ${(s * 1.4).toFixed(2)} ${(s * 0.9).toFixed(2)}`} fill="none" stroke={tone.flow} strokeWidth="0.6" strokeLinecap="round" />);
    }
    return out;
  };

  const short: MassOpts = { thick: 2.6, lift: 2.2, locks: 9, len: [1.8, 3.2], lean: 0.3, hairline: 11, sideDown: -1, sideburn: true, fringe: { count: 5, len: [1.4, 2.8], lean: -0.35 } };

  let back: ReactNode = null;
  let front: ReactNode = null;
  let foreheadShadow = true;

  switch (style) {
    case 'bald': {
      foreheadShadow = false;
      front = (
        <g>
          <ellipse cx={50 - g.w * 0.35} cy={g.t + 7} rx="6.5" ry="3" fill="#fff" opacity="0.3" transform={`rotate(-14 ${50 - g.w * 0.35} ${g.t + 7})`} />
          <path d={`M ${pt([50 - g.w * 0.62, g.t + 4.5])} Q ${pt([50 - g.w * 0.4, g.t + 1.5])} ${pt([50 - g.w * 0.12, g.t + 1.6])}`} stroke="#fff" strokeWidth="1.1" fill="none" opacity="0.45" strokeLinecap="round" />
        </g>
      );
      break;
    }
    case 'buzz':
      front = clipped(12, 70, undefined, 'bz');
      break;
    case 'receding': {
      const line: P[] = [
        [50 + g.w * 0.92, g.m - 5],
        [50 + g.w * 0.6, g.t + 3.5],
        [50 + g.w * 0.3, g.t + 7.5],
        [50, g.t + 9],
        [50 - g.w * 0.3, g.t + 7.5],
        [50 - g.w * 0.6, g.t + 3.5],
        [50 - g.w * 0.92, g.m - 5],
      ];
      front = clipped(9, 55, line, 'rc', 0.85);
      break;
    }
    case 'short':
      front = shadedMass(short, { flowEvery: 2 });
      break;
    case 'fringe':
      front = shadedMass({ ...short, hairline: 15, lift: 1.8, fringe: { count: 7, len: [3, 5.2], lean: 0.25 } }, { flowEvery: 3 });
      break;
    case 'sidepart': {
      const px = 50 - g.w * 0.38;
      front = shadedMass(
        { ...short, lean: 0.75, locks: 8, len: [2.2, 3.6], hairline: 10, fringe: undefined, line: [[50 + g.w * 0.86, g.t + 18], [50 + g.w * 0.55, g.t + 13], [50 + g.w * 0.15, g.t + 10], [px + 2, g.t + 9], [px - 2, g.t + 10.5], [50 - g.w * 0.62, g.t + 12], [50 - g.w * 0.86, g.t + 17]] },
        {
          flowEvery: 1,
          extra: () => (
            <path d={`M ${pt([px, g.t + 10])} Q ${pt([px - 0.6, g.t + 4])} ${pt([px + 1.2, g.t - 1])}`} stroke={ctx.skinShade} strokeWidth="1" fill="none" strokeLinecap="round" />
          ),
        },
      );
      break;
    }
    case 'curtains': {
      const line: P[] = [
        [50 + g.w + 0.6, g.m - 3],
        [50 + g.w * 0.8, g.t + 19],
        [50 + g.w * 0.45, g.t + 13],
        [50 + 1.6, g.t + 6],
        [50, g.t + 4.5],
        [50 - 1.6, g.t + 6],
        [50 - g.w * 0.45, g.t + 13],
        [50 - g.w * 0.8, g.t + 19],
        [50 - g.w - 0.6, g.m - 3],
      ];
      front = shadedMass(
        { ...short, thick: 3, lift: 2, hairline: 10, fringe: undefined, line, sideDown: 0 },
        {
          extra: () => (
            <g fill="none" stroke={tone.flow} strokeWidth="0.65" strokeLinecap="round">
              {[-1, 1].map((s) => (
                <g key={s}>
                  <path d={`M ${pt([50 + s * 1, g.t + 1])} Q ${pt([50 + s * g.w * 0.45, g.t + 3])} ${pt([50 + s * g.w * 0.78, g.t + 15])}`} />
                  <path d={`M ${pt([50 + s * 3, g.t + 0])} Q ${pt([50 + s * g.w * 0.65, g.t + 1])} ${pt([50 + s * g.w * 0.92, g.t + 11])}`} />
                </g>
              ))}
              <path d={`M 50 ${g.t - 1} L 50 ${g.t + 5}`} stroke={ctx.skinShade} strokeWidth="0.9" />
            </g>
          ),
        },
      );
      break;
    }
    case 'quiff': {
      const base = mass({ ...short, thick: 2, lift: 1.4, fringe: undefined, hairline: 10 });
      const qv = arcPoints(50 + 1.5, g.t + 6, g.w * 0.78, 11, 200, 334, 6, r);
      const q = lockSegs(qv, r, { len: [2, 3.6], lean: 0.9, from: [50, g.t + 16], sharp: 0.5 });
      const quiff = `M ${pt(qv[0])}${q.d}${smoothSegs([qv[qv.length - 1], [50 + g.w * 0.4, g.t + 8], [50 - g.w * 0.2, g.t + 9.5], qv[0]])} Z`;
      front = (
        <g>
          <Shaded id={id('qb')} d={base.d} tone={tone} ink={ink} sheen={sheenPath(g, r, { thick: 2, lift: 1.4 })} />
          <Shaded id={id('qf')} d={quiff} tone={tone} ink={ink} sheen={sheenPath({ ...g, t: g.t - 6, w: g.w * 0.75 }, r, { thick: 0, lift: 0, from: 220, to: 300, depth: 0.88 })} flow={flowFromTips(q.tips, g, r, 2, 0.3)} />
        </g>
      );
      break;
    }
    case 'slick':
      front = shadedMass({ thick: 2.2, lift: 1.4, locks: 12, len: [0.5, 1.3], lean: 0.9, sharp: 0.1, hairline: 10, sideDown: -2, sideburn: true }, { flowEvery: 1 });
      break;
    case 'spiky':
      front = shadedMass({ thick: 2, lift: 3, locks: 9, len: [3.8, 6.8], lean: 0.05, sharp: 0.95, hairline: 11, sideDown: -2, sideburn: true, fringe: { count: 4, len: [1.5, 2.8], lean: 0.1 } }, { flowEvery: 2 });
      break;
    case 'gelled': {
      const top = mass({ thick: 1.8, lift: 2.4, locks: 8, len: [3, 5.4], lean: 0.15, sharp: 0.85, hairline: 11.5, from: 200, to: 340, sideDown: -4, fringe: { count: 4, len: [1.2, 2.4], lean: 0.2 } });
      front = (
        <g>
          {clipped(13, 45, undefined, 'gs', 0.75)}
          <Shaded
            id={id('gt')}
            d={top.d}
            tone={tone}
            ink={ink}
            extra={top.tips.map((t, i) => (
              <path key={i} d={`M ${pt(t)} L ${pt(lerp(t, [50, g.t + 10], 0.4))}`} stroke="#fff" strokeWidth="0.9" opacity="0.55" strokeLinecap="round" />
            ))}
          />
        </g>
      );
      break;
    }
    case 'frosted': {
      const m = mass({ thick: 2.2, lift: 2.6, locks: 10, len: [2.6, 4.6], lean: 0.1, sharp: 0.7, hairline: 11, sideDown: -1.5, sideburn: true, fringe: { count: 5, len: [1.6, 3], lean: 0.15 } });
      front = (
        <Shaded
          id={id('fr')}
          d={m.d}
          tone={tone}
          ink={ink}
          extra={m.tips.map((t, i) => (
            <path key={i} d={taper(lerp(t, [50, g.m], 0.13), t, 0, 1.9, 0.25)} fill={frost} />
          ))}
        />
      );
      break;
    }
    case 'curly': {
      const m = mass({ thick: 3.6, lift: 3, locks: 11, len: [2, 3.2], lean: 0, sharp: 0, hairline: 11, sideDown: -1, sideburn: true, fringe: { count: 6, len: [1.6, 2.6], lean: 0 } });
      front = <Shaded id={id('cu')} d={m.d} tone={tone} ink={ink} sheen={sheenPath(g, r, { thick: 3.6, lift: 3, depth: 0.85 })} extra={curls(50, g.m, g.w + 3, g.m - g.t + 5, 14, 'c')} />;
      break;
    }
    case 'afro': {
      const big = cloud(50, g.t + 13, g.w + 11, g.w + 8, 12, 0.07, r);
      back = <Shaded id={id('ab')} d={big} tone={tone} ink={ink} sheen={sheenPath({ ...g, t: g.t - 10, w: g.w + 9 }, r, { thick: 0, lift: 0, depth: 0.85 })} extra={curls(50, g.t + 13, g.w + 9, g.w + 6, 18, 'a')} />;
      const m = mass({ thick: 2, lift: 1, locks: 9, len: [1.4, 2.4], lean: 0, sharp: 0, hairline: 11, sideDown: -1, sideburn: true });
      front = <Shaded id={id('af')} d={m.d} tone={tone} ink={ink} outline={false} extra={curls(50, g.m, g.w, g.m - g.t, 6, 'f')} />;
      break;
    }
    case 'mohawk': {
      const fv: P[] = [];
      for (let i = 0; i <= 5; i++) fv.push([50 - 6.5 + i * 0.9, g.t + 7 - i * 3.2]);
      const fv2: P[] = [];
      for (let i = 0; i <= 5; i++) fv2.push([50 + 6.8 - i * 1.1, g.t - 9 + i * 3.2]);
      const left = lockSegs(fv, r, { len: [2, 3.6], lean: 0.4, from: [56, g.t], sharp: 0.85 });
      const right = lockSegs(fv2, r, { len: [1.6, 3], lean: 0.4, from: [44, g.t], sharp: 0.85 });
      const fin = `M ${pt(fv[0])}${left.d} L ${pt(fv2[0])}${right.d} Q ${pt([50, g.t + 9])} ${pt(fv[0])} Z`;
      front = (
        <g>
          {clipped(12, 40, undefined, 'mh', 0.5)}
          <Shaded id={id('mf')} d={fin} tone={tone} ink={ink} flow={[`M 50.5 ${g.t + 6} Q 49.6 ${g.t - 3} 50.6 ${g.t - 11}`]} />
        </g>
      );
      break;
    }
    case 'cornrows': {
      const rows: ReactNode[] = [];
      for (let i = 0; i < 6; i++) {
        const x0 = 50 - g.w * 0.72 + i * ((g.w * 1.44) / 5);
        const a: P = [x0, g.t + 12];
        const b: P = [50 + (x0 - 50) * 0.45, g.t - 1.5];
        const segs = 5;
        for (let k = 0; k < segs; k++) {
          const p = lerp(a, b, (k + 0.5) / segs);
          rows.push(<ellipse key={`${i}-${k}`} cx={p[0]} cy={p[1]} rx="1.55" ry="1.15" transform={`rotate(${k % 2 ? 35 : -35} ${p[0]} ${p[1]})`} fill={tone.base} stroke={ink} strokeWidth="0.35" />);
        }
      }
      front = (
        <g>
          {clipped(13, 0, undefined, 'cr', 0.55)}
          {rows}
        </g>
      );
      break;
    }
    case 'dreads': {
      const ropes: ReactNode[] = [];
      const n = 10;
      for (let i = 0; i < n; i++) {
        const deg = 190 + (160 * i) / (n - 1);
        const top = squircle(50, g.m, g.w + 1, g.m - g.t + 1, deg);
        const spread = (top[0] - 50) * 0.35;
        const end: P = [top[0] + spread * 0.9 + between(r, -2, 2), g.c + 5 + between(r, -3, 6) - Math.abs(i - (n - 1) / 2) * 1.2];
        const d = taper(top, end, between(r, -4, 4), between(r, 2.4, 3), between(r, 1.4, 1.9));
        ropes.push(
          <g key={i}>
            <path d={d} fill={tone.base} stroke={ink} strokeWidth="0.6" />
            {Array.from({ length: 5 }).map((_, k) => {
              const p = lerp(top, end, (k + 1) / 6);
              return <path key={k} d={`M ${pt([p[0] - 1.4, p[1] - 0.3])} l 2.8 0.8`} stroke={tone.sh} strokeWidth="0.55" />;
            })}
          </g>,
        );
      }
      back = <g>{ropes}</g>;
      const m = mass({ thick: 2.4, lift: 1.6, locks: 8, len: [1.2, 2.2], lean: 0, sharp: 0.2, hairline: 10.5, sideDown: -1 });
      const hang: ReactNode[] = [-1, 1].flatMap((s) =>
        [0].map((k) => {
          const a: P = [50 + s * (g.w - 0.5), g.t + 13];
          const b: P = [50 + s * (g.w + 4), g.m + 12 + between(r, -2, 3)];
          return <path key={`${s}${k}`} d={taper(a, b, s * 2.5, 2.4, 1.6)} fill={tone.base} stroke={ink} strokeWidth="0.6" />;
        }),
      );
      front = (
        <g>
          <Shaded id={id('df')} d={m.d} tone={tone} ink={ink} sheen={sheenPath(g, r, { thick: 2.4, lift: 1.6, depth: 0.88 })} />
          {hang}
        </g>
      );
      break;
    }
    case 'long':
    case 'mullet': {
      const isLong = style === 'long';
      const bottom = isLong ? g.c + 12 : g.c + 10;
      const half = isLong ? g.w + 6 : g.w - 2;
      const bv: P[] = [];
      for (let i = 0; i <= 7; i++) bv.push([50 - half + (2 * half * i) / 7, bottom - Math.sin((Math.PI * i) / 7) * (isLong ? 3 : 1)]);
      const bl = lockSegs(bv, r, { len: [2, 4], lean: 0.2, from: [50, g.m], dir: [0, 1], sharp: 0.6 });
      const topL = squircle(50, g.m, g.w + (isLong ? 3.5 : 1), g.m - g.t + 3, isLong ? 196 : 182);
      const topR = squircle(50, g.m, g.w + (isLong ? 3.5 : 1), g.m - g.t + 3, isLong ? 344 : 358);
      const hang = `M ${pt(topL)}${smoothSegs([topL, [50 - half - (isLong ? 1 : -1), (topL[1] + bottom) / 2], bv[0]])}${bl.d}${smoothSegs([bv[bv.length - 1], [50 + half + (isLong ? 1 : -1), (topR[1] + bottom) / 2], topR])} Q 50 ${g.t - 6} ${pt(topL)} Z`;
      back = <Shaded id={id('lb')} d={hang} tone={tone} ink={ink} flow={flowFromTips(bl.tips, { ...g, t: g.m - 8 }, r, 2, 0.5)} />;
      if (isLong) {
        const line: P[] = [
          [50 + g.w - 1.4, g.m + 10],
          [50 + g.w - 2.5, g.m - 2],
          [50 + g.w * 0.62, g.t + 12],
          [50 + 3, g.t + 7],
          [50 + 0.6, g.t + 5.5],
          [50 - 2.5, g.t + 7.5],
          [50 - g.w * 0.62, g.t + 12.5],
          [50 - g.w + 2.5, g.m - 2],
          [50 - g.w + 1.4, g.m + 10],
        ];
        front = shadedMass(
          { thick: 3.2, lift: 2.2, locks: 9, len: [1.6, 2.8], lean: 0.1, sharp: 0.4, hairline: 9, sideDown: 11, line },
          {
            extra: () => (
              <g fill="none" stroke={tone.flow} strokeWidth="0.65" strokeLinecap="round">
                <path d={`M ${pt([50 + 0.6, g.t + 4])} Q ${pt([50 + g.w * 0.7, g.t + 4])} ${pt([50 + g.w + 1.5, g.m + 6])}`} />
                <path d={`M ${pt([50 - 1, g.t + 4])} Q ${pt([50 - g.w * 0.7, g.t + 5])} ${pt([50 - g.w - 1.5, g.m + 6])}`} />
              </g>
            ),
          },
        );
      } else {
        front = shadedMass({ ...short, lean: 0.35 }, { flowEvery: 2 });
      }
      break;
    }
    case 'ponytail':
    case 'manbun': {
      const slick: MassOpts = { thick: 2, lift: 1.2, locks: 12, len: [0.4, 1.1], lean: 1, sharp: 0.1, hairline: 10, sideDown: -2, sideburn: true };
      if (style === 'ponytail') {
        const a: P = [50 + g.w * 0.55, g.t + 9];
        const b: P = [50 + g.w + 5, g.c + 11];
        back = (
          <g>
            <Shaded id={id('pt')} d={taper(a, b, -5, 4.2, 1.1)} tone={tone} ink={ink} flow={[`M ${pt(lerp(a, b, 0.2))} Q ${pt([b[0] + 1, (a[1] + b[1]) / 2])} ${pt(lerp(a, b, 0.85))}`]} />
            <path d={taper(lerp(a, b, 0.08), lerp(a, b, 0.16), 0, 3.6, 3.2)} fill="#1f2937" stroke={ink} strokeWidth="0.5" />
          </g>
        );
        front = shadedMass(slick, { flowEvery: 1 });
      } else {
        const bun = cloud(50, g.t - 4.5, 7, 5.8, 6, 0.08, r);
        front = (
          <g>
            <Shaded id={id('bn')} d={bun} tone={tone} ink={ink} flow={[`M ${pt([45.5, g.t - 5])} Q 50 ${g.t - 8.5} ${pt([54.5, g.t - 5.5])}`, `M ${pt([46, g.t - 2])} Q 50 ${g.t - 4.5} ${pt([54, g.t - 2.5])}`]} />
            {shadedMass(slick, { flowEvery: 1, key: 'mb' })}
          </g>
        );
      }
      break;
    }
    default:
      front = shadedMass(short, { flowEvery: 2 });
  }
  return { back, front, foreheadShadow };
}
