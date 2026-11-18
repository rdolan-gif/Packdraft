import type { ReactNode } from 'react';
import type { FacialHair } from '../../types/game';
import type { Geo, HairTone } from './hair';
import { between, lockSegs, pt, rng, smoothSegs, type P } from './organic';

// Organic facial hair: stubble as a shadow plus short strokes, moustaches as two tapered wings,
// beards with tufted edges that follow the jaw. Same flat shading and ink outline as the hair.

interface Ctx {
  g: Geo;
  mouthY: number;
  tone: HairTone;
  ink: string;
  seed: number;
  uid: string;
  style: FacialHair;
}

function shaded(id: string, d: string, tone: HairTone, ink: string, extra?: ReactNode) {
  return (
    <g key={id}>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={tone.sh} />
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={tone.base} transform="translate(-0.8 -1.2)" />
        {extra}
      </g>
      <path d={d} fill="none" stroke={ink} strokeWidth="0.75" strokeLinejoin="round" />
    </g>
  );
}

export function facialHair(ctx: Ctx): ReactNode {
  const { g, mouthY: y, tone, ink, uid, style } = ctx;
  if (style === 'none') return null;
  const r = rng(ctx.seed ^ 0x9e3779b9);
  const id = (k: string) => `${uid}-fh${k}`;

  // Moustache: two tapered wings meeting under the nose, lower edge made of small locks.
  const tache = (droop: number) => {
    const wing = (s: number) => {
      const top: P = [50 + s * 0.8, y - 5.6];
      const tip: P = [50 + s * between(r, 9, 10.2), y - 0.2 + droop];
      const bottom: P[] = [tip, [50 + s * 6.4, y - 1.8], [50 + s * 3.2, y - 2.6], [50 + s * 0.4, y - 2.4]];
      const lower = lockSegs(bottom, r, { len: [0.5, 1.1], lean: 0.2, from: [50, y - 10], sharp: 0.6 });
      return `M ${pt(top)} Q ${pt([50 + s * 6, y - 7.2])} ${pt(tip)}${lower.d} Z`;
    };
    return [wing(-1), wing(1)];
  };

  switch (style) {
    case 'stubble': {
      const region = `M ${pt([50 - g.w + 1.2, g.m + 2])} C ${pt([50 - g.w + 1, g.m + 14])} ${pt([50 - g.j, g.c - 3])} ${pt([50, g.c + 0.6])} C ${pt([50 + g.j, g.c - 3])} ${pt([50 + g.w - 1, g.m + 14])} ${pt([50 + g.w - 1.2, g.m + 2])} C ${pt([50 + g.w - 5, y - 3])} ${pt([50 + 5, y - 7])} ${pt([50, y - 6.2])} C ${pt([50 - 5, y - 7])} ${pt([50 - g.w + 5, y - 3])} ${pt([50 - g.w + 1.2, g.m + 2])} Z`;
      const strokes: ReactNode[] = [];
      for (let i = 0; i < 70; i++) {
        const x = between(r, 50 - g.w, 50 + g.w);
        const yy = between(r, g.m + 1, g.c + 1);
        strokes.push(<path key={i} d={`M ${pt([x, yy])} l ${((x - 50) * 0.03).toFixed(2)} 0.75`} stroke={tone.base} strokeWidth="0.5" strokeLinecap="round" opacity="0.75" />);
      }
      return (
        <g>
          <clipPath id={id('s')}>
            <path d={region} />
          </clipPath>
          <path d={region} fill={tone.base} opacity="0.2" />
          <g clipPath={`url(#${id('s')})`}>{strokes}</g>
        </g>
      );
    }
    case 'moustache':
      return <g>{tache(between(r, 0.5, 2)).map((d, i) => shaded(id(`m${i}`), d, tone, ink))}</g>;
    case 'goatee': {
      const bv: P[] = [];
      for (let i = 0; i <= 5; i++) bv.push([50 - 5.6 + (11.2 * i) / 5, g.c - 1 + Math.sin((Math.PI * i) / 5) * 2.4]);
      const bl = lockSegs(bv, r, { len: [1, 2], lean: 0, from: [50, y], dir: [0, 1], sharp: 0.6 });
      const chin = `M ${pt([50 - 6.4, y + 2])}${smoothSegs([[50 - 6.4, y + 2], [50 - 6.2, g.c - 4], bv[0]])}${bl.d}${smoothSegs([bv[bv.length - 1], [50 + 6.2, g.c - 4], [50 + 6.4, y + 2]])} Q 50 ${y + 4.6} ${pt([50 - 6.4, y + 2])} Z`;
      return (
        <g>
          {shaded(id('g'), chin, tone, ink, <path d={`M 50 ${y + 5} L 50 ${g.c}`} stroke={tone.flow} strokeWidth="0.55" opacity="0.7" />)}
          {tache(0.6).map((d, i) => shaded(id(`gm${i}`), d, tone, ink))}
        </g>
      );
    }
    case 'beard':
    case 'fullbeard': {
      const full = style === 'fullbeard';
      const drop = full ? 7 : 2.5;
      const L: P = [50 - g.w + 0.4, g.m - 2];
      const R: P = [50 + g.w - 0.4, g.m - 2];
      const bv: P[] = [];
      const n = full ? 9 : 7;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = 50 + (t - 0.5) * 2 * (g.j + 5 + (full ? 2 : 0));
        const yy = g.c - 4 + Math.sin(Math.PI * t) * (drop + 4);
        bv.push([x, yy]);
      }
      const bl = lockSegs(bv, r, { len: full ? [1.6, 3] : [0.9, 1.8], lean: 0, from: [50, g.m], sharp: 0.55 });
      const d =
        `M ${pt(L)}` +
        smoothSegs([L, [50 - g.w + 0.6, g.m + 10], bv[0]]) +
        bl.d +
        smoothSegs([bv[bv.length - 1], [50 + g.w - 0.6, g.m + 10], R]) +
        // inner edge: cheek line down to the mouth, round under the lip, back up the other cheek
        smoothSegs([R, [50 + g.w - 3.4, g.m + 3], [50 + 9.5, y - 1.5], [50 + 6.4, y + 3.4], [50, y + 4.4], [50 - 6.4, y + 3.4], [50 - 9.5, y - 1.5], [50 - g.w + 3.4, g.m + 3], L]) +
        ' Z';
      const flow = bl.tips
        .filter((_, i) => i % 2 === 1)
        .map((t, i) => <path key={i} d={`M ${pt(t)} Q ${pt([t[0] + between(r, -1, 1), t[1] - 3])} ${pt([t[0] * 0.8 + 10, t[1] - 6])}`} fill="none" stroke={tone.flow} strokeWidth="0.55" strokeLinecap="round" opacity="0.75" />);
      return (
        <g>
          {shaded(id('b'), d, tone, ink, flow)}
          {tache(0.4).map((dd, i) => shaded(id(`bm${i}`), dd, tone, ink))}
        </g>
      );
    }
    default:
      return null;
  }
}
