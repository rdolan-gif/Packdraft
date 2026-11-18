import { memo } from 'react';
import type { CaricatureProps, CollarStyle, Expression, HairColor, HeadShape, KitDesign, SkinTone } from '../types/game';
import { hairLayers, type HairTone } from './portrait/hair';
import { facialHair } from './portrait/facialHair';

/** Blend two hex colours (t = share of b). */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Brand ink: one outline colour and weight for every portrait. */
const INK = '#161c2b';

const SKIN: Record<SkinTone, { base: string; shade: string; blush: string; line: string }> = {
  pale: { base: '#f6d7c3', shade: '#e3b59c', blush: '#f0a49a', line: '#b98670' },
  light: { base: '#efc4a1', shade: '#d9a27c', blush: '#e8907c', line: '#ad7552' },
  tan: { base: '#d9a27a', shade: '#bf8159', blush: '#cf7a62', line: '#94603d' },
  olive: { base: '#c99468', shade: '#a87549', blush: '#b8705a', line: '#835632' },
  brown: { base: '#a86f45', shade: '#8a5530', blush: '#9a5a40', line: '#653c1f' },
  dark: { base: '#7c4a2a', shade: '#62361b', blush: '#7a3e2a', line: '#45240f' },
  deep: { base: '#5a3420', shade: '#432414', blush: '#5e2f20', line: '#2d170b' },
};

const HAIR: Record<HairColor, { base: string; hi: string; line: string }> = {
  black: { base: '#141414', hi: '#4a4a4a', line: '#000000' },
  darkbrown: { base: '#2e1d12', hi: '#664430', line: '#140c06' },
  brown: { base: '#5b3a1e', hi: '#93643a', line: '#2e1c0d' },
  blonde: { base: '#d9b25c', hi: '#f6e1a3', line: '#9a7630' },
  ginger: { base: '#c2582a', hi: '#ee9258', line: '#7d3313' },
  grey: { base: '#8f8f8f', hi: '#d4d4d4', line: '#5c5c5c' },
  bleached: { base: '#e8dcae', hi: '#fffbe6', line: '#b3a46e' },
};
const FROST = '#f4e6b0';

interface HeadGeo {
  t: number; // top of skull
  w: number; // cheek half-width
  j: number; // jaw half-width
  c: number; // chin y
  m: number; // widest point y
}

const HEAD: Record<HeadShape, HeadGeo> = {
  round: { t: 22, w: 24, j: 16, c: 76, m: 46 },
  oval: { t: 20, w: 21.5, j: 13, c: 77, m: 46 },
  square: { t: 22, w: 23, j: 20, c: 75, m: 48 },
  long: { t: 15, w: 19, j: 12, c: 81, m: 46 },
  heart: { t: 22, w: 25, j: 10, c: 76, m: 43 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function headPath({ t, w, j, c, m }: HeadGeo) {
  return `M50 ${t} C ${50 + w * 0.98} ${t} ${50 + w} ${t + 12} ${50 + w} ${m} C ${50 + w} ${m + 11} ${50 + j} ${c - 5} 50 ${c} C ${50 - j} ${c - 5} ${50 - w} ${m + 11} ${50 - w} ${m} C ${50 - w} ${t + 12} ${50 - w * 0.98} ${t} 50 ${t} Z`;
}

/** Skull cap shape (used by the scrum cap accessory). */
function capPath({ t, w }: HeadGeo, to: number, lift = 2, sideDrop = 0) {
  return `M ${50 - w - 0.8} ${to + sideDrop} C ${50 - w - 1.5} ${t + 6} ${50 - w * 0.7} ${t - lift} 50 ${t - lift} C ${50 + w * 0.7} ${t - lift} ${50 + w + 1.5} ${t + 6} ${50 + w + 0.8} ${to + sideDrop} C ${50 + w * 0.6} ${to - 6} ${50 - w * 0.6} ${to - 6} ${50 - w - 0.8} ${to + sideDrop} Z`;
}

/** The neckline of the shirt from the left shoulder point to the right one. */
function neckline(style: CollarStyle) {
  switch (style) {
    case 'v':
      return 'L 50 96.5 L 62 84';
    case 'polo':
      return 'L 50 92 L 61 84';
    default:
      return 'Q 50 94 62 84';
  }
}

function Mouth({ expression, skinShade, cx = 50, y }: { expression: Expression; skinShade: string; cx?: number; y: number }) {
  const lip = '#7a2f2a';
  switch (expression) {
    case 'grin':
      return (
        <g>
          <path d={`M ${cx - 9} ${y - 1} Q ${cx} ${y + 9} ${cx + 9} ${y - 1} Q ${cx} ${y + 1.4} ${cx - 9} ${y - 1} Z`} fill="#3b0d0d" stroke={lip} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M ${cx - 8} ${y - 0.3} Q ${cx} ${y + 2.6} ${cx + 8} ${y - 0.3} L ${cx + 7} ${y + 1.6} Q ${cx} ${y + 4} ${cx - 7} ${y + 1.6} Z`} fill="#fff" />
          <path d={`M ${cx - 4} ${y + 5.2} Q ${cx} ${y + 6.6} ${cx + 4} ${y + 5.2}`} stroke="#c0474a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'smirk':
      return <path d={`M ${cx - 6} ${y + 1} Q ${cx + 1} ${y + 3.5} ${cx + 8} ${y - 2.5}`} fill="none" stroke={lip} strokeWidth="1.8" strokeLinecap="round" />;
    case 'determined':
      return (
        <g>
          <path d={`M ${cx - 6} ${y + 1} Q ${cx} ${y - 0.5} ${cx + 6} ${y + 1}`} fill="none" stroke={lip} strokeWidth="2" strokeLinecap="round" />
          <path d={`M ${cx - 3} ${y + 4.2} Q ${cx} ${y + 5} ${cx + 3} ${y + 4.2}`} fill="none" stroke={skinShade} strokeWidth="1.1" strokeLinecap="round" />
        </g>
      );
    case 'roar':
      return (
        <g>
          <path d={`M ${cx - 8} ${y - 1} Q ${cx} ${y - 4} ${cx + 8} ${y - 1} Q ${cx + 7} ${y + 11} ${cx} ${y + 11} Q ${cx - 7} ${y + 11} ${cx - 8} ${y - 1} Z`} fill="#3b0d0d" stroke={lip} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M ${cx - 6.5} ${y - 1.4} Q ${cx} ${y - 3.4} ${cx + 6.5} ${y - 1.4} L ${cx + 6} ${y + 1} Q ${cx} ${y - 0.6} ${cx - 6} ${y + 1} Z`} fill="#fff" />
          <ellipse cx={cx} cy={y + 7.5} rx="4.2" ry="2.3" fill="#c0474a" />
        </g>
      );
    case 'cool':
      return <path d={`M ${cx - 6} ${y} Q ${cx} ${y + 3.5} ${cx + 6} ${y}`} fill="none" stroke={lip} strokeWidth="1.8" strokeLinecap="round" />;
    case 'focused':
      return <path d={`M ${cx - 4.5} ${y + 1} Q ${cx} ${y + 0.4} ${cx + 4.5} ${y + 1}`} stroke={lip} strokeWidth="1.8" strokeLinecap="round" fill="none" />;
    case 'tongue':
      return (
        <g>
          <path d={`M ${cx - 8} ${y - 1} Q ${cx} ${y + 8} ${cx + 8} ${y - 1} Q ${cx} ${y + 1} ${cx - 8} ${y - 1} Z`} fill="#3b0d0d" stroke={lip} strokeWidth="1" />
          <path d={`M ${cx - 3} ${y + 2} Q ${cx + 1} ${y + 11} ${cx + 5} ${y + 2} Z`} fill="#e0566a" />
          <path d={`M ${cx - 7} ${y - 0.5} Q ${cx} ${y + 2} ${cx + 7} ${y - 0.5}`} fill="#fff" stroke="none" />
        </g>
      );
    default:
      return <path d={`M ${cx - 5} ${y} Q ${cx} ${y + 2} ${cx + 5} ${y}`} fill="none" stroke={skinShade} strokeWidth="1.5" />;
  }
}

/** Shirt pattern, drawn inside the shirt's clip and under the sleeves. */
function KitPattern({ kit }: { kit: KitDesign }) {
  const c = kit.patternColor;
  switch (kit.pattern) {
    case 'stripes': {
      const w = 100 / (kit.bands * 2 + 1);
      return (
        <g fill={c}>
          {Array.from({ length: kit.bands }).map((_, i) => (
            <rect key={i} x={w * (2 * i + 1)} y="80" width={w} height="32" />
          ))}
        </g>
      );
    }
    case 'hoops':
      return (
        <g fill={c}>
          {[0, 1, 2].map((i) => (
            <rect key={i} x="0" y={88 + i * 8} width="100" height="4" />
          ))}
        </g>
      );
    case 'halves':
      return <rect x="50" y="80" width="50" height="32" fill={c} />;
    case 'sash':
      return <path d="M 18 82 L 28 82 L 88 112 L 78 112 Z" fill={c} />;
    case 'pinstripes':
      return (
        <g stroke={c} strokeWidth="0.45" opacity="0.75">
          {Array.from({ length: 30 }).map((_, i) => (
            <path key={i} d={`M ${2 + i * 3.4} 80 L ${2 + i * 3.4} 112`} />
          ))}
        </g>
      );
    case 'shadow':
      return (
        <g fill={c} opacity="0.12">
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d={`M ${-20 + i * 8} 112 L ${-12 + i * 8} 112 L ${18 + i * 8} 80 L ${10 + i * 8} 80 Z`} />
          ))}
        </g>
      );
    case 'chestband':
      return <rect x="0" y="93" width="100" height="5" fill={c} />;
    case 'yoke':
      return <path d="M 0 80 L 100 80 L 100 92 Q 50 88 0 92 Z" fill={c} />;
    default:
      return null;
  }
}

/** Our own club badge (never a real crest) and a generic maker's mark, on the chest. */
function KitBadges({ kit }: { kit: KitDesign }) {
  const bx = 60.8;
  const by = 94.2;
  const shape =
    kit.badge.shape === 'round'
      ? <circle cx={bx} cy={by + 2.4} r="2.6" />
      : kit.badge.shape === 'crest'
        ? <path d={`M ${bx - 2.6} ${by} L ${bx + 2.6} ${by} L ${bx + 2.6} ${by + 3} Q ${bx + 2.6} ${by + 5.2} ${bx} ${by + 6} Q ${bx - 2.6} ${by + 5.2} ${bx - 2.6} ${by + 3} Z`} />
        : <path d={`M ${bx - 2.5} ${by + 0.4} Q ${bx} ${by - 0.6} ${bx + 2.5} ${by + 0.4} L ${bx + 2.3} ${by + 3.4} Q ${bx + 1.6} ${by + 5.4} ${bx} ${by + 6} Q ${bx - 1.6} ${by + 5.4} ${bx - 2.3} ${by + 3.4} Z`} />;
  const mx = 39.2;
  const my = 95.6;
  const m = kit.maker;
  const mark =
    m.mark === 'chevron' ? <path d={`M ${mx - 1.6} ${my - 0.6} L ${mx} ${my + 0.8} L ${mx + 1.6} ${my - 0.6}`} fill="none" stroke={m.color} strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" />
    : m.mark === 'bars' ? <path d={`M ${mx - 1.4} ${my + 0.9} L ${mx - 0.4} ${my - 0.9} M ${mx + 0.4} ${my + 0.9} L ${mx + 1.4} ${my - 0.9}`} stroke={m.color} strokeWidth="0.7" strokeLinecap="round" />
    : m.mark === 'diamond' ? <path d={`M ${mx} ${my - 1.2} L ${mx + 1.2} ${my} L ${mx} ${my + 1.2} L ${mx - 1.2} ${my} Z`} fill={m.color} />
    : <circle cx={mx} cy={my} r="0.9" fill={m.color} />;
  return (
    <g>
      <g fill={kit.badge.fill} stroke={INK} strokeWidth="0.45">{shape}</g>
      <rect x={bx - 2.4} y={by + 2.1} width="4.8" height="1.1" fill={kit.badge.band} />
      {mark}
    </g>
  );
}

function PlayerCaricatureImpl({ traits, kitPrimaryColor: plainBody, kitSecondaryColor, kitSleeveColor, kitCollarColor, collarStyle: plainCollar, kit, seed, size = 120, className }: CaricatureProps) {
  const kitPrimaryColor = kit?.body ?? plainBody;
  const sleeve = kit?.sleeve ?? kitSleeveColor ?? kitSecondaryColor;
  const collar = kit?.collar ?? kitCollarColor ?? kitSecondaryColor;
  const collarStyle = kit?.collarStyle ?? plainCollar;
  const h = hash(seed);
  const uid = `pc${h.toString(36)}`;
  const skin = SKIN[traits.skinTone];
  const hair = HAIR[traits.hairColor];
  const g = HEAD[traits.headShape];
  const eyeY = g.m + 1.5;
  const eyeDx = 8.5 + ((h >> 3) % 3) * 0.6;
  const browY = eyeY - 7;
  const browThick = 2.4 + ((h >> 5) % 3) * 0.45;
  const noseLen = 6 + ((h >> 7) % 3);
  const mouthY = Math.min(g.c - 9, eyeY + noseLen + 10);
  const ex = traits.expression;
  const angry = ex === 'roar' || ex === 'determined' || ex === 'focused';
  const lidded = ex === 'cool' || ex === 'smirk';
  const hs = traits.hairStyle;
  const fh = traits.facialHair;
  const fair = traits.skinTone === 'pale' || traits.skinTone === 'light';
  const iris = fair && (traits.hairColor === 'blonde' || traits.hairColor === 'bleached' || traits.hairColor === 'ginger' || (h >> 11) % 4 === 0) ? '#4b7bb0' : '#4a2c18';
  const neck = collarStyle ?? (['crew', 'v', 'polo'] as const)[(h >> 9) % 3];
  // Organic hair and facial hair (see ./portrait): shapes vary per player, shaded in the brand style.
  const dark = traits.hairColor === 'black' || traits.hairColor === 'darkbrown';
  const tone: HairTone = { base: hair.base, hi: hair.hi, sh: mix(hair.base, '#000000', dark ? 0.35 : 0.24), flow: dark ? hair.hi : mix(hair.base, '#000000', 0.42) };
  const { back: hairBack, front: hairFront } = hairLayers({ g, tone, style: hs, seed: h, uid, ink: INK, frost: FROST, skinShade: skin.shade });
  const facial = facialHair({ g, mouthY, tone, ink: INK, seed: h, uid, style: fh });

  const acc = traits.accessory;
  const browColor = traits.hairColor === 'bleached' || traits.hairColor === 'blonde' ? '#8a6a30' : traits.hairColor === 'grey' ? '#6b6b6b' : hair.base;
  const shirt = `M 6 110 C 8 94 20 87 38 84 ${neckline(neck)} C 80 87 92 94 94 110 Z`;
  const neckEdge = `M 38 84 ${neckline(neck)}`;

  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} aria-hidden="true">
      <defs>
        <pattern id={`${uid}-stubble`} width="2.2" height="2.2" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.45" fill={hair.base} opacity="0.7" />
        </pattern>
        <radialGradient id={`${uid}-face`} cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor={skin.base} />
          <stop offset="70%" stopColor={skin.base} />
          <stop offset="70%" stopColor={skin.shade} />
          <stop offset="100%" stopColor={skin.shade} />
        </radialGradient>
        <linearGradient id={`${uid}-hair`} x1="0" x2="0.3" y1="0" y2="1">
          <stop offset="0%" stopColor={hair.hi} />
          <stop offset="20%" stopColor={hair.hi} />
          <stop offset="20%" stopColor={hair.base} />
          <stop offset="100%" stopColor={hair.base} />
        </linearGradient>
        <linearGradient id={`${uid}-kitshade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="58%" stopColor="#000" stopOpacity="0" />
          <stop offset="58%" stopColor="#000" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <clipPath id={`${uid}-shirt`}>
          <path d={shirt} />
        </clipPath>
      </defs>

      {/* hair that falls behind the head goes underneath everything, so the neck and shoulders sit in front of it */}
      {hairBack}

      {/* neck first, so the shirt's neckline frames it */}
      <path d="M 41 70 L 41 79 Q 40.5 83 35 85 L 35 102 L 65 102 L 65 85 Q 59.5 83 59 79 L 59 70 Z" fill={skin.shade} stroke={INK} strokeWidth="1.1" />
      <path d="M 41 74 Q 50 82 59 74 L 59 80 Q 50 86 41 80 Z" fill={skin.line} opacity="0.25" />

      {/* shirt, with the neck opening cut into it */}
      <path d={shirt} fill={kitPrimaryColor} />
      <g clipPath={`url(#${uid}-shirt)`}>
        {kit && <KitPattern kit={kit} />}
        {/* raglan sleeves in the sleeve colour */}
        <path d="M 4 110 C 6 96 15 89 31 85.4 C 27 93 23 101 22 112 Z" fill={sleeve} />
        <path d="M 96 110 C 94 96 85 89 69 85.4 C 73 93 77 101 78 112 Z" fill={sleeve} />
        <path d="M 31 85.4 C 27 93 23 101 22 112 M 69 85.4 C 73 93 77 101 78 112" stroke="rgba(0,0,0,.22)" strokeWidth="0.7" fill="none" />
        {kit?.piping && <path d="M 31.6 85.4 C 27.6 93 23.6 101 22.6 112 M 68.4 85.4 C 72.4 93 76.4 101 77.4 112" stroke={kit.trim} strokeWidth="1.1" fill="none" />}
        {/* soft folds */}
        <path d="M 38 100 Q 42 104 40 110 M 62 100 Q 58 104 60 110" stroke="rgba(0,0,0,.12)" strokeWidth="1.2" fill="none" />
        {/* shadow cast by the head */}
        <ellipse cx="50" cy="86" rx="15" ry="4" fill="rgba(0,0,0,.18)" />
        <rect x="0" y="80" width="100" height="30" fill={`url(#${uid}-kitshade)`} />
      </g>
      {/* collar: trim that follows the neckline, part of the shirt */}
      {neck === 'polo' ? (
        <g>
          <path d="M 50 92 L 50 104" stroke="rgba(0,0,0,.25)" strokeWidth="0.8" />
          <circle cx="50" cy="96" r="0.9" fill={collar} stroke="rgba(0,0,0,.35)" strokeWidth="0.3" />
          <circle cx="50" cy="100.5" r="0.9" fill={collar} stroke="rgba(0,0,0,.35)" strokeWidth="0.3" />
          {/* folded collar points lying on the shirt */}
          <path d="M 36.5 83.2 Q 40 82.5 41.5 84.2 L 50 92.2 L 45.5 95.5 Q 40 91 36.5 83.2 Z" fill={collar} stroke="rgba(0,0,0,.3)" strokeWidth="0.5" strokeLinejoin="round" />
          <path d="M 63.5 83.2 Q 60 82.5 58.5 84.2 L 50 92.2 L 54.5 95.5 Q 60 91 63.5 83.2 Z" fill={collar} stroke="rgba(0,0,0,.3)" strokeWidth="0.5" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
          <path d={neckEdge} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="3.9" strokeLinejoin="round" strokeLinecap="round" />
          <path d={neckEdge} fill="none" stroke={collar} strokeWidth="2.9" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      )}
      {kit && <KitBadges kit={kit} />}
      <path d={shirt} fill="none" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      {acc === 'captainband' && <rect x="12" y="98" width="11" height="5" rx="1" fill="#facc15" stroke="#000" strokeWidth="0.5" transform="rotate(-14 17 100)" />}
      {acc === 'snood' && <path d="M 39 74 L 39 88 Q 50 93 61 88 L 61 74 Q 50 78 39 74 Z" fill="#111" />}

      {/* ears */}
      <ellipse cx={50 - g.w - 0.5} cy={eyeY + 2} rx="4" ry="6" fill={skin.shade} stroke={INK} strokeWidth="0.9" />
      <ellipse cx={50 + g.w + 0.5} cy={eyeY + 2} rx="4" ry="6" fill={skin.shade} stroke={INK} strokeWidth="0.9" />
      <path d={`M ${50 - g.w - 1.5} ${eyeY - 1} q -1.5 3 0 6`} stroke={skin.line} strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d={`M ${50 + g.w + 1.5} ${eyeY - 1} q 1.5 3 0 6`} stroke={skin.line} strokeWidth="0.7" fill="none" opacity="0.6" />
      {acc === 'earring' && <circle cx={50 + g.w + 1} cy={eyeY + 8} r="1.6" fill="#f8fafc" stroke="#facc15" strokeWidth="0.6" />}

      {/* head */}
      <path d={headPath(g)} fill={`url(#${uid}-face)`} stroke={INK} strokeWidth="1.1" />
      {/* cheeks */}
      <ellipse cx={50 - g.w * 0.6} cy={mouthY - 4} rx="4" ry="2.4" fill={skin.blush} opacity="0.32" />
      <ellipse cx={50 + g.w * 0.6} cy={mouthY - 4} rx="4" ry="2.4" fill={skin.blush} opacity="0.32" />

      {facial}

      {/* eyes: almond shape, coloured iris, a lid line that sets the mood */}
      {[-1, 1].map((s) => {
        const cx = 50 + s * eyeDx;
        const top = lidded ? 1.6 : angry ? 2.4 : 3.4;
        const look = ex === 'smirk' ? 1 : ex === 'cool' ? -0.6 : 0;
        return (
          <g key={s}>
            <path d={`M ${cx - 4.6} ${eyeY} Q ${cx} ${eyeY - top * 1.25} ${cx + 4.6} ${eyeY} Q ${cx} ${eyeY + 3.1} ${cx - 4.6} ${eyeY} Z`} fill="#fff" />
            <circle cx={cx + look} cy={eyeY + 0.2} r="2.25" fill={iris} />
            <circle cx={cx + look} cy={eyeY + 0.2} r="1.15" fill="#120a05" />
            <circle cx={cx + look + 0.8} cy={eyeY - 0.7} r="0.65" fill="#fff" />
            {lidded && <path d={`M ${cx - 4.8} ${eyeY - 0.3} Q ${cx} ${eyeY - 3.6} ${cx + 4.8} ${eyeY - 0.3} Q ${cx} ${eyeY - 1.4} ${cx - 4.8} ${eyeY - 0.3} Z`} fill={skin.shade} />}
            <path d={`M ${cx - 4.8} ${eyeY + 0.2} Q ${cx} ${eyeY - top * 1.3} ${cx + 4.8} ${eyeY + 0.2}`} stroke="#2a160b" strokeWidth="1.05" fill="none" strokeLinecap="round" />
          </g>
        );
      })}

      {/* brows: tapered, thick at the inner end */}
      {[-1, 1].map((s) => {
        const inner = 50 + s * (eyeDx - 4.5);
        const outer = 50 + s * (eyeDx + 5.2);
        const innerY = browY + (angry ? 2.2 : ex === 'smirk' && s === 1 ? -1.6 : 0);
        const outerY = browY - (angry ? 1 : 0.5);
        const midX = (inner + outer) / 2;
        const midY = Math.min(innerY, outerY) - 1.6;
        const t = browThick;
        return (
          <path
            key={s}
            d={`M ${inner} ${innerY + t * 0.5} Q ${midX} ${midY + t * 0.45} ${outer} ${outerY + 0.3} Q ${midX} ${midY - t * 0.55} ${inner} ${innerY - t * 0.5} Z`}
            fill={browColor}
            stroke={browColor}
            strokeWidth="0.4"
            strokeLinejoin="round"
          />
        );
      })}

      {/* nose */}
      <path d={`M 49 ${eyeY + 2} Q 47 ${eyeY + noseLen + 2} 50.5 ${eyeY + noseLen + 3} Q 53 ${eyeY + noseLen + 3} 52.5 ${eyeY + noseLen + 1}`} fill="none" stroke={skin.line} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />

      <Mouth expression={ex} skinShade={skin.shade} y={mouthY} cx={50} />

      {hairFront}

      {/* accessories over head */}
      {acc === 'headband' && <path d={`M ${50 - g.w - 1} ${g.t + 12} Q 50 ${g.t + 5} ${50 + g.w + 1} ${g.t + 12} L ${50 + g.w + 1} ${g.t + 17} Q 50 ${g.t + 10} ${50 - g.w - 1} ${g.t + 17} Z`} fill={kitSecondaryColor === '#ffffff' ? '#f8fafc' : kitSecondaryColor} stroke="rgba(0,0,0,.3)" strokeWidth="0.5" />}
      {acc === 'alice' && <path d={`M ${50 - g.w} ${g.t + 12} Q 50 ${g.t + 2} ${50 + g.w} ${g.t + 12}`} stroke="#111" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      {acc === 'scrumcap' && (
        <g>
          <path d={capPath(g, g.t + 20, 4, 10)} fill="#1f2937" stroke="#000" strokeWidth="0.8" />
          {[-0.5, 0, 0.5].map((k) => (
            <path key={k} d={`M ${50 + k * g.w * 1.4} ${g.t - 3} Q ${50 + k * g.w * 1.8} ${g.t + 10} ${50 + k * g.w * 2} ${g.t + 22}`} stroke="#4b5563" strokeWidth="1" fill="none" />
          ))}
          <path d={`M ${50 - g.w} ${g.t + 28} Q ${50 - g.j} ${g.c + 2} 50 ${g.c + 2} Q ${50 + g.j} ${g.c + 2} ${50 + g.w} ${g.t + 28}`} stroke="#1f2937" strokeWidth="1.6" fill="none" />
        </g>
      )}
      {acc === 'goggles' && (
        <g>
          <path d={`M ${50 - g.w - 1} ${eyeY - 1} L ${50 + g.w + 1} ${eyeY - 1}`} stroke="#111" strokeWidth="2.4" />
          {[-1, 1].map((s) => (
            <ellipse key={s} cx={50 + s * eyeDx} cy={eyeY} rx="6.4" ry="5" fill="#f59e0b" fillOpacity="0.45" stroke="#111" strokeWidth="2" />
          ))}
          <path d={`M 47 ${eyeY} L 53 ${eyeY}`} stroke="#111" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

export const PlayerCaricature = memo(PlayerCaricatureImpl);
export default PlayerCaricature;
