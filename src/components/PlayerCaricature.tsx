import { memo } from 'react';
import type { CaricatureProps, Expression, HairColor, HeadShape, SkinTone } from '../types/game';

const SKIN: Record<SkinTone, { base: string; shade: string; blush: string }> = {
  pale: { base: '#f6d7c3', shade: '#e3b59c', blush: '#f0a49a' },
  light: { base: '#efc4a1', shade: '#d9a27c', blush: '#e8907c' },
  tan: { base: '#d9a27a', shade: '#bf8159', blush: '#cf7a62' },
  olive: { base: '#c99468', shade: '#a87549', blush: '#b8705a' },
  brown: { base: '#a86f45', shade: '#8a5530', blush: '#9a5a40' },
  dark: { base: '#7c4a2a', shade: '#62361b', blush: '#7a3e2a' },
  deep: { base: '#5a3420', shade: '#432414', blush: '#5e2f20' },
};

const HAIR: Record<HairColor, { base: string; hi: string }> = {
  black: { base: '#141414', hi: '#3a3a3a' },
  darkbrown: { base: '#2e1d12', hi: '#5a3a24' },
  brown: { base: '#5b3a1e', hi: '#8a5a32' },
  blonde: { base: '#d9b25c', hi: '#f2d68f' },
  ginger: { base: '#c2582a', hi: '#e8844c' },
  grey: { base: '#8f8f8f', hi: '#c8c8c8' },
  bleached: { base: '#e8dcae', hi: '#fff7d6' },
};

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

/** Skull cap (for short hair styles) hugging the top of the head down to `to` y. */
function capPath({ t, w }: HeadGeo, to: number, lift = 2, sideDrop = 0) {
  return `M ${50 - w - 0.8} ${to + sideDrop} C ${50 - w - 1.5} ${t + 6} ${50 - w * 0.7} ${t - lift} 50 ${t - lift} C ${50 + w * 0.7} ${t - lift} ${50 + w + 1.5} ${t + 6} ${50 + w + 0.8} ${to + sideDrop} C ${50 + w * 0.6} ${to - 6} ${50 - w * 0.6} ${to - 6} ${50 - w - 0.8} ${to + sideDrop} Z`;
}

function Mouth({ expression, skinShade, cx = 50, y }: { expression: Expression; skinShade: string; cx?: number; y: number }) {
  const lip = '#7a2f2a';
  switch (expression) {
    case 'grin':
      return (
        <g>
          <path d={`M ${cx - 9} ${y - 1} Q ${cx} ${y + 9} ${cx + 9} ${y - 1} Z`} fill="#3b0d0d" stroke={lip} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M ${cx - 8} ${y - 0.5} Q ${cx} ${y + 3} ${cx + 8} ${y - 0.5} L ${cx + 7} ${y + 1.5} Q ${cx} ${y + 4} ${cx - 7} ${y + 1.5} Z`} fill="#fff" />
        </g>
      );
    case 'smirk':
      return <path d={`M ${cx - 6} ${y + 1} Q ${cx + 1} ${y + 3.5} ${cx + 8} ${y - 2.5}`} fill="none" stroke={lip} strokeWidth="1.8" strokeLinecap="round" />;
    case 'determined':
      return <path d={`M ${cx - 6} ${y + 1} Q ${cx} ${y - 0.5} ${cx + 6} ${y + 1}`} fill="none" stroke={lip} strokeWidth="2" strokeLinecap="round" />;
    case 'roar':
      return (
        <g>
          <ellipse cx={cx} cy={y + 3} rx="7.5" ry="6.5" fill="#3b0d0d" stroke={lip} strokeWidth="1" />
          <rect x={cx - 6} y={y - 3} width="12" height="2.6" rx="1" fill="#fff" />
          <ellipse cx={cx} cy={y + 6.5} rx="4" ry="2" fill="#c0474a" />
        </g>
      );
    case 'cool':
      return <path d={`M ${cx - 6} ${y} Q ${cx} ${y + 3.5} ${cx + 6} ${y}`} fill="none" stroke={lip} strokeWidth="1.8" strokeLinecap="round" />;
    case 'focused':
      return <path d={`M ${cx - 4.5} ${y + 1} L ${cx + 4.5} ${y + 1}`} stroke={lip} strokeWidth="1.8" strokeLinecap="round" />;
    case 'tongue':
      return (
        <g>
          <path d={`M ${cx - 8} ${y - 1} Q ${cx} ${y + 8} ${cx + 8} ${y - 1} Z`} fill="#3b0d0d" stroke={lip} strokeWidth="1" />
          <path d={`M ${cx - 3} ${y + 2} Q ${cx + 1} ${y + 11} ${cx + 5} ${y + 2} Z`} fill="#e0566a" />
          <path d={`M ${cx - 7} ${y - 0.5} Q ${cx} ${y + 2} ${cx + 7} ${y - 0.5}`} fill="#fff" stroke="none" />
        </g>
      );
    default:
      return <path d={`M ${cx - 5} ${y} Q ${cx} ${y + 2} ${cx + 5} ${y}`} fill="none" stroke={skinShade} strokeWidth="1.5" />;
  }
}

function PlayerCaricatureImpl({ traits, kitPrimaryColor, kitSecondaryColor, kitSleeveColor, kitCollarColor, seed, size = 120, className }: CaricatureProps) {
  const sleeve = kitSleeveColor ?? kitSecondaryColor;
  const collar = kitCollarColor ?? kitSecondaryColor;
  const h = hash(seed);
  const uid = `pc${h.toString(36)}`;
  const skin = SKIN[traits.skinTone];
  const hair = HAIR[traits.hairColor];
  const g = HEAD[traits.headShape];
  const eyeY = g.m + 1.5;
  const eyeDx = 8.5 + ((h >> 3) % 3) * 0.6;
  const browY = eyeY - 7;
  const browThick = 2.6 + ((h >> 5) % 3) * 0.5;
  const noseLen = 6 + ((h >> 7) % 3);
  const mouthY = Math.min(g.c - 9, eyeY + noseLen + 10);
  const ex = traits.expression;
  const angry = ex === 'roar' || ex === 'determined' || ex === 'focused';
  const lidded = ex === 'cool' || ex === 'smirk';
  const hs = traits.hairStyle;
  const fh = traits.facialHair;

  // ── Hair behind head
  const hairBack = (() => {
    switch (hs) {
      case 'afro':
        return <circle cx="50" cy={g.t + 10} r={g.w + 13} fill={hair.base} />;
      case 'long':
        return <path d={`M ${50 - g.w - 4} ${g.t + 10} Q 50 ${g.t - 12} ${50 + g.w + 4} ${g.t + 10} L ${50 + g.w + 6} ${g.c + 8} Q 50 ${g.c + 2} ${50 - g.w - 6} ${g.c + 8} Z`} fill={hair.base} />;
      case 'dreads':
        return (
          <g fill={hair.base}>
            {Array.from({ length: 9 }).map((_, i) => {
              const x = 50 - g.w - 3 + i * ((g.w * 2 + 6) / 8);
              return <rect key={i} x={x - 2.2} y={g.t + 6} width="4.4" height={g.c - g.t + 2 - Math.abs(i - 4) * 2} rx="2.2" />;
            })}
          </g>
        );
      case 'ponytail':
        return <path d={`M ${50 + g.w - 4} ${g.t + 14} q 14 4 12 22 q -2 10 -8 14 q 2 -12 -6 -24 Z`} fill={hair.base} />;
      default:
        return null;
    }
  })();

  // ── Hair on top of head
  const hairFront = (() => {
    const cap = (to: number, lift = 2, side = 0) => <path d={capPath(g, to, lift, side)} fill={hair.base} />;
    switch (hs) {
      case 'bald':
        return <ellipse cx={50 - g.w * 0.35} cy={g.t + 7} rx="6" ry="3" fill="#fff" opacity="0.28" />;
      case 'buzz':
        return (
          <g opacity="0.9">
            {cap(g.t + 13, 0.5, 4)}
            <path d={capPath(g, g.t + 13, 0.5, 4)} fill={`url(#${uid}-stubble)`} />
          </g>
        );
      case 'short':
        return (
          <g>
            {cap(g.t + 14, 3, 5)}
            <path d={`M ${50 - g.w * 0.7} ${g.t + 9} Q 50 ${g.t + 15} ${50 + g.w * 0.6} ${g.t + 8}`} stroke={hair.hi} strokeWidth="1" fill="none" opacity="0.6" />
          </g>
        );
      case 'quiff':
        return (
          <g>
            {cap(g.t + 13, 3, 5)}
            <path d={`M ${50 - g.w * 0.8} ${g.t + 6} C ${50 - g.w * 0.6} ${g.t - 14} ${50 + g.w * 0.9} ${g.t - 16} ${50 + g.w * 0.8} ${g.t + 4} C ${50 + g.w * 0.3} ${g.t - 4} ${50 - g.w * 0.3} ${g.t - 2} ${50 - g.w * 0.8} ${g.t + 6} Z`} fill={hair.base} />
            <path d={`M ${50 - g.w * 0.4} ${g.t - 3} C ${50} ${g.t - 11} ${50 + g.w * 0.5} ${g.t - 11} ${50 + g.w * 0.7} ${g.t - 2}`} stroke={hair.hi} strokeWidth="1.6" fill="none" opacity="0.7" />
          </g>
        );
      case 'curly':
        return (
          <g fill={hair.base}>
            {cap(g.t + 12, 2, 6)}
            {Array.from({ length: 11 }).map((_, i) => {
              const a = Math.PI + (i / 10) * Math.PI;
              return <circle key={i} cx={50 + Math.cos(a) * (g.w + 1)} cy={g.t + 12 + Math.sin(a) * 14} r="5.2" />;
            })}
            {Array.from({ length: 6 }).map((_, i) => (
              <circle key={`h${i}`} cx={50 - g.w * 0.55 + i * g.w * 0.22} cy={g.t + 1 + (i % 2) * 2} r="2" fill={hair.hi} opacity="0.35" />
            ))}
          </g>
        );
      case 'afro':
        return (
          <g fill={hair.base}>
            {cap(g.t + 12, 3, 8)}
            {Array.from({ length: 14 }).map((_, i) => {
              const a = Math.PI * 0.95 + (i / 13) * Math.PI * 1.1;
              return <circle key={i} cx={50 + Math.cos(a) * (g.w + 10)} cy={g.t + 10 + Math.sin(a) * (g.w + 10)} r="7" />;
            })}
          </g>
        );
      case 'ponytail':
      case 'slick':
        return (
          <g>
            {cap(g.t + 12, 2.5, 5)}
            <path d={`M ${50 - g.w * 0.4} ${g.t - 1} Q ${50 + g.w * 0.2} ${g.t + 2} ${50 + g.w * 0.9} ${g.t + 8}`} stroke={hair.hi} strokeWidth="1.4" fill="none" opacity="0.8" />
            <path d={`M ${50 - g.w * 0.3} ${g.t - 1} L ${50 - g.w * 0.35} ${g.t + 10}`} stroke={skin.shade} strokeWidth="0.8" opacity="0.6" />
          </g>
        );
      case 'manbun':
        return (
          <g fill={hair.base}>
            {cap(g.t + 12, 2.5, 5)}
            <ellipse cx="50" cy={g.t - 5} rx="7" ry="6" />
            <path d={`M 45 ${g.t - 1} Q 50 ${g.t + 1} 55 ${g.t - 1}`} stroke={hair.hi} strokeWidth="1" fill="none" />
          </g>
        );
      case 'long':
        return (
          <g>
            {cap(g.t + 14, 3, 8)}
            <path d={`M 50 ${g.t - 2} Q ${50 - g.w * 0.5} ${g.t + 8} ${50 - g.w - 1} ${g.m}`} stroke={hair.hi} strokeWidth="1.2" fill="none" opacity="0.5" />
          </g>
        );
      case 'mohawk':
        return (
          <g>
            <path d={capPath(g, g.t + 12, 0, 4)} fill={hair.base} opacity="0.35" />
            <path d={`M 44 ${g.t + 8} Q 50 ${g.t - 14} 56 ${g.t + 8} Z`} fill={hair.base} />
          </g>
        );
      case 'dreads':
        return (
          <g>
            {cap(g.t + 13, 3, 4)}
            {Array.from({ length: 5 }).map((_, i) => (
              <path key={i} d={`M ${50 - g.w * 0.7 + i * g.w * 0.35} ${g.t + 2} l 0 10`} stroke={hair.hi} strokeWidth="1" opacity="0.4" />
            ))}
          </g>
        );
      case 'spiky':
        return (
          <g fill={hair.base}>
            {cap(g.t + 12, 2, 4)}
            {Array.from({ length: 7 }).map((_, i) => {
              const x = 50 - g.w * 0.85 + i * ((g.w * 1.7) / 6);
              return <path key={i} d={`M ${x - 4} ${g.t + 4} L ${x + (i - 3) * 0.8} ${g.t - 9 + Math.abs(i - 3)} L ${x + 4} ${g.t + 4} Z`} />;
            })}
          </g>
        );
      case 'fringe':
        return (
          <g>
            {cap(g.t + 18, 3, 3)}
            <path d={`M ${50 - g.w} ${g.t + 15} Q 50 ${g.t + 22} ${50 + g.w} ${g.t + 15} L ${50 + g.w} ${g.t + 10} L ${50 - g.w} ${g.t + 10} Z`} fill={hair.base} />
          </g>
        );
      case 'cornrows':
        return (
          <g>
            {cap(g.t + 13, 1.5, 4)}
            {Array.from({ length: 6 }).map((_, i) => {
              const x = 50 - g.w * 0.75 + i * ((g.w * 1.5) / 5);
              return <path key={i} d={`M ${x} ${g.t + 12} Q ${x * 0.9 + 5} ${g.t + 2} ${50 + (x - 50) * 0.4} ${g.t - 1}`} stroke={hair.hi} strokeWidth="1" fill="none" opacity="0.7" />;
            })}
          </g>
        );
      default:
        return null;
    }
  })();

  const facialHair = (() => {
    const beardColor = hair.base;
    const jaw = `M ${50 - g.w + 1} ${g.m + 2} C ${50 - g.w + 1} ${g.m + 14} ${50 - g.j} ${g.c - 3} 50 ${g.c + 1} C ${50 + g.j} ${g.c - 3} ${50 + g.w - 1} ${g.m + 14} ${50 + g.w - 1} ${g.m + 2}`;
    switch (fh) {
      case 'stubble':
        return <path d={`${jaw} C ${50 + g.w - 6} ${mouthY - 2} ${50 - g.w + 6} ${mouthY - 2} ${50 - g.w + 1} ${g.m + 2} Z`} fill={`url(#${uid}-stubble)`} opacity="0.85" />;
      case 'goatee':
        return (
          <g fill={beardColor}>
            <path d={`M 44 ${mouthY - 3.5} Q 50 ${mouthY - 6} 56 ${mouthY - 3.5} L 55 ${mouthY - 2} Q 50 ${mouthY - 4} 45 ${mouthY - 2} Z`} />
            <path d={`M 45 ${mouthY + 4} Q 50 ${g.c + 4} 55 ${mouthY + 4} Q 50 ${mouthY + 6} 45 ${mouthY + 4} Z`} />
          </g>
        );
      case 'moustache':
        return <path d={`M 42 ${mouthY - 2} Q 50 ${mouthY - 7} 58 ${mouthY - 2} Q 50 ${mouthY - 3.5} 42 ${mouthY - 2} Z`} fill={beardColor} />;
      case 'beard':
      case 'fullbeard': {
        const full = fh === 'fullbeard';
        const drop = full ? 6 : 2;
        return (
          <g fill={beardColor}>
            <path
              d={`M ${50 - g.w + 0.5} ${g.m - 2} C ${50 - g.w} ${g.m + 16} ${50 - g.j - 2} ${g.c + drop} 50 ${g.c + drop + 2} C ${50 + g.j + 2} ${g.c + drop} ${50 + g.w} ${g.m + 16} ${50 + g.w - 0.5} ${g.m - 2} L ${50 + g.w - 4} ${g.m + 4} C ${50 + 9} ${mouthY - 4} ${50 - 9} ${mouthY - 4} ${50 - g.w + 4} ${g.m + 4} Z`}
            />
            <path d={`M 42 ${mouthY - 2} Q 50 ${mouthY - 7} 58 ${mouthY - 2} Q 50 ${mouthY - 3.5} 42 ${mouthY - 2} Z`} />
          </g>
        );
      }
      default:
        return null;
    }
  })();

  const acc = traits.accessory;
  const collarV = (h >> 9) % 2 === 0;

  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} className={className} aria-hidden="true">
      <defs>
        <pattern id={`${uid}-stubble`} width="2.2" height="2.2" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.45" fill={hair.base} opacity="0.7" />
        </pattern>
        <radialGradient id={`${uid}-face`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.shade} />
        </radialGradient>
        <linearGradient id={`${uid}-kit`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={kitPrimaryColor} />
          <stop offset="100%" stopColor={kitPrimaryColor} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* shoulders & kit */}
      <path d="M 8 110 C 10 92 24 86 38 84 L 62 84 C 76 86 90 92 92 110 Z" fill={`url(#${uid}-kit)`} stroke="rgba(0,0,0,.35)" strokeWidth="0.8" />
      <path d="M 8 110 C 9 101 13 95 19 91 L 22 110 Z" fill={sleeve} opacity="0.9" />
      <path d="M 92 110 C 91 101 87 95 81 91 L 78 110 Z" fill={sleeve} opacity="0.9" />
      {acc === 'captainband' && <rect x="12" y="98" width="11" height="5" rx="1" fill="#facc15" stroke="#000" strokeWidth="0.5" transform="rotate(-14 17 100)" />}

      {/* neck */}
      <path d="M 41 70 L 41 86 Q 50 92 59 86 L 59 70 Z" fill={skin.shade} />
      {/* collar */}
      {collarV ? (
        <path d="M 37 84 L 50 97 L 63 84 L 59 83 L 50 92 L 41 83 Z" fill={collar} stroke="rgba(0,0,0,.25)" strokeWidth="0.5" />
      ) : (
        <path d="M 37 84 Q 50 94 63 84 L 61 82 Q 50 90 39 82 Z" fill={collar} stroke="rgba(0,0,0,.25)" strokeWidth="0.5" />
      )}
      {acc === 'snood' && <path d="M 39 76 L 39 88 Q 50 93 61 88 L 61 76 Q 50 80 39 76 Z" fill="#111" />}

      {hairBack}

      {/* ears */}
      <ellipse cx={50 - g.w - 0.5} cy={eyeY + 2} rx="4" ry="6" fill={skin.shade} />
      <ellipse cx={50 + g.w + 0.5} cy={eyeY + 2} rx="4" ry="6" fill={skin.shade} />
      {acc === 'earring' && <circle cx={50 + g.w + 1} cy={eyeY + 8} r="1.6" fill="#f8fafc" stroke="#facc15" strokeWidth="0.6" />}

      {/* head */}
      <path d={headPath(g)} fill={`url(#${uid}-face)`} stroke="rgba(0,0,0,.35)" strokeWidth="0.9" />
      {/* cheeks */}
      <ellipse cx={50 - g.w * 0.6} cy={mouthY - 4} rx="4" ry="2.4" fill={skin.blush} opacity="0.35" />
      <ellipse cx={50 + g.w * 0.6} cy={mouthY - 4} rx="4" ry="2.4" fill={skin.blush} opacity="0.35" />

      {facialHair}

      {/* eyes */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={50 + s * eyeDx} cy={eyeY} rx="4.4" ry={lidded ? 2.2 : angry ? 2.8 : 3.4} fill="#fff" />
          <circle cx={50 + s * eyeDx + (ex === 'smirk' ? 1 : 0)} cy={eyeY + (lidded ? 0.4 : 0)} r="2.1" fill="#2b1a10" />
          <circle cx={50 + s * eyeDx + 0.8} cy={eyeY - 0.8} r="0.7" fill="#fff" />
          {lidded && <path d={`M ${50 + s * eyeDx - 4.6} ${eyeY - 1} Q ${50 + s * eyeDx} ${eyeY - 3.4} ${50 + s * eyeDx + 4.6} ${eyeY - 1}`} fill={skin.shade} />}
        </g>
      ))}

      {/* brows: bold, heroic */}
      {[-1, 1].map((s) => {
        const inner = 50 + s * (eyeDx - 4.5);
        const outer = 50 + s * (eyeDx + 5);
        const innerY = browY + (angry ? 2.2 : ex === 'smirk' && s === 1 ? -1.6 : 0);
        const outerY = browY - (angry ? 1 : 0.5);
        return <path key={s} d={`M ${inner} ${innerY} Q ${(inner + outer) / 2} ${Math.min(innerY, outerY) - 1.6} ${outer} ${outerY}`} stroke={hair.base === '#e8dcae' || hair.base === '#d9b25c' ? '#8a6a30' : hair.base} strokeWidth={browThick} strokeLinecap="round" fill="none" />;
      })}

      {/* nose */}
      <path d={`M 49 ${eyeY + 2} Q 47 ${eyeY + noseLen + 2} 50.5 ${eyeY + noseLen + 3} Q 53 ${eyeY + noseLen + 3} 52.5 ${eyeY + noseLen + 1}`} fill="none" stroke={skin.shade} strokeWidth="1.5" strokeLinecap="round" />

      <Mouth expression={ex} skinShade={skin.shade} y={mouthY} cx={50} />

      {hairFront}

      {/* accessories over head */}
      {acc === 'headband' && <path d={`M ${50 - g.w - 1} ${g.t + 12} Q 50 ${g.t + 5} ${50 + g.w + 1} ${g.t + 12} L ${50 + g.w + 1} ${g.t + 17} Q 50 ${g.t + 10} ${50 - g.w - 1} ${g.t + 17} Z`} fill={kitSecondaryColor === '#ffffff' ? '#f8fafc' : kitSecondaryColor} stroke="rgba(0,0,0,.3)" strokeWidth="0.5" />}
      {acc === 'alice' && <path d={`M ${50 - g.w} ${g.t + 12} Q 50 ${g.t + 2} ${50 + g.w} ${g.t + 12}`} stroke="#111" strokeWidth="1.4" fill="none" />}
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
