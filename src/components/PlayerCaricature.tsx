import { memo } from 'react';
import type { CaricatureProps, CollarStyle, Expression, HairColor, HeadShape, SkinTone } from '../types/game';

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

/** Skull cap (for short hair styles) hugging the top of the head down to `to` y. */
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

function PlayerCaricatureImpl({ traits, kitPrimaryColor, kitSecondaryColor, kitSleeveColor, kitCollarColor, collarStyle, seed, size = 120, className }: CaricatureProps) {
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
  const hairStroke = { stroke: hair.line, strokeWidth: 0.7, strokeLinejoin: 'round' as const };

  // ── Hair behind the head
  const hairBack = (() => {
    switch (hs) {
      case 'afro':
        return <circle cx="50" cy={g.t + 10} r={g.w + 13} fill={hair.base} {...hairStroke} />;
      case 'long':
        return <path d={`M ${50 - g.w - 4} ${g.t + 10} Q 50 ${g.t - 12} ${50 + g.w + 4} ${g.t + 10} L ${50 + g.w + 6} ${g.c + 8} Q 50 ${g.c + 2} ${50 - g.w - 6} ${g.c + 8} Z`} fill={`url(#${uid}-hair)`} {...hairStroke} />;
      case 'mullet':
        // business at the front, party at the back: hair hangs to the shoulders behind the neck
        return <path d={`M ${50 - g.w - 1} ${g.m - 6} Q ${50 - g.w - 3} ${g.c + 4} ${50 - g.w + 2} ${g.c + 12} L ${50 + g.w - 2} ${g.c + 12} Q ${50 + g.w + 3} ${g.c + 4} ${50 + g.w + 1} ${g.m - 6} Z`} fill={`url(#${uid}-hair)`} {...hairStroke} />;
      case 'dreads':
        return (
          <g fill={hair.base} {...hairStroke}>
            {Array.from({ length: 9 }).map((_, i) => {
              const x = 50 - g.w - 3 + i * ((g.w * 2 + 6) / 8);
              return <rect key={i} x={x - 2.2} y={g.t + 6} width="4.4" height={g.c - g.t + 2 - Math.abs(i - 4) * 2} rx="2.2" />;
            })}
          </g>
        );
      case 'ponytail':
        // tied at the back: the tail falls behind the neck and shows over the right shoulder
        return (
          <g>
            <path d={`M ${50 + g.w * 0.55} ${g.t + 12} C ${50 + g.w + 10} ${g.t + 18} ${50 + g.w + 9} ${g.c - 2} ${50 + g.w + 3} ${g.c + 11} C ${50 + g.w} ${g.c + 4} ${50 + g.w + 1} ${g.t + 24} ${50 + g.w * 0.4} ${g.t + 18} Z`} fill={`url(#${uid}-hair)`} {...hairStroke} />
            <path d={`M ${50 + g.w + 4} ${g.m - 4} Q ${50 + g.w + 6} ${g.m + 6} ${50 + g.w + 4} ${g.m + 14}`} stroke={hair.hi} strokeWidth="0.9" fill="none" opacity="0.6" />
          </g>
        );
      default:
        return null;
    }
  })();

  // A soft shadow under the hairline gives the hair some depth on the forehead.
  const hairShadow = (to: number, lift: number, side: number) => <path d={capPath(g, to + 1.6, lift - 1.6, side)} fill={skin.shade} opacity="0.55" />;

  // ── Hair on top of the head
  const hairFront = (() => {
    const cap = (to: number, lift = 2, side = 0) => (
      <>
        {hairShadow(to, lift, side)}
        <path d={capPath(g, to, lift, side)} fill={`url(#${uid}-hair)`} {...hairStroke} />
      </>
    );
    const shine = (op = 0.55) => <path d={`M ${50 - g.w * 0.55} ${g.t + 4} Q ${50 - g.w * 0.1} ${g.t - 1} ${50 + g.w * 0.35} ${g.t + 1}`} stroke={hair.hi} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity={op} />;
    switch (hs) {
      case 'bald':
        return <ellipse cx={50 - g.w * 0.35} cy={g.t + 7} rx="6" ry="3" fill="#fff" opacity="0.28" />;
      case 'receding': {
        // receding hairline: thin on top, an M-shaped retreat at the temples, short at the sides
        const side = (s: number) => `M ${50 + s * (g.w + 0.8)} ${g.m - 1} C ${50 + s * (g.w + 1.4)} ${g.t + 12} ${50 + s * g.w * 0.8} ${g.t + 4} ${50 + s * g.w * 0.45} ${g.t + 6} C ${50 + s * g.w * 0.62} ${g.t + 12} ${50 + s * g.w * 0.8} ${g.t + 18} ${50 + s * (g.w - 2)} ${g.m - 2} Z`;
        return (
          <g>
            <path d={capPath(g, g.t + 9, 0.5, 2)} fill={`url(#${uid}-stubble)`} opacity="0.55" />
            <path d={`M ${50 - g.w * 0.3} ${g.t + 2} Q 50 ${g.t + 5} ${50 + g.w * 0.3} ${g.t + 2} Q 50 ${g.t - 0.8} ${50 - g.w * 0.3} ${g.t + 2} Z`} fill={hair.base} opacity="0.75" />
            <path d={side(-1)} fill={hair.base} opacity="0.92" />
            <path d={side(1)} fill={hair.base} opacity="0.92" />
            <ellipse cx={50 - g.w * 0.2} cy={g.t + 9} rx="5" ry="2.2" fill="#fff" opacity="0.22" />
          </g>
        );
      }
      case 'buzz':
        return (
          <g opacity="0.92">
            <path d={capPath(g, g.t + 13, 0.5, 4)} fill={hair.base} opacity="0.85" />
            <path d={capPath(g, g.t + 13, 0.5, 4)} fill={`url(#${uid}-stubble)`} />
            <path d={`M ${50 - g.w * 0.5} ${g.t + 3} Q 50 ${g.t} ${50 + g.w * 0.3} ${g.t + 2}`} stroke={hair.hi} strokeWidth="1.2" fill="none" opacity="0.35" strokeLinecap="round" />
          </g>
        );
      case 'short':
        return (
          <g>
            {cap(g.t + 14, 3, 5)}
            <path d={`M ${50 - g.w * 0.7} ${g.t + 9} Q 50 ${g.t + 15} ${50 + g.w * 0.6} ${g.t + 8}`} stroke={hair.line} strokeWidth="0.8" fill="none" opacity="0.5" />
            {shine()}
          </g>
        );
      case 'sidepart': {
        const px = 50 - g.w * 0.38;
        return (
          <g>
            {cap(g.t + 13, 3.5, 5)}
            {/* the swept side lifts over the parting */}
            <path d={`M ${px} ${g.t + 1} C ${50 + g.w * 0.2} ${g.t - 4} ${50 + g.w * 0.9} ${g.t - 1} ${50 + g.w + 1} ${g.t + 12} C ${50 + g.w * 0.6} ${g.t + 5} ${50} ${g.t + 6} ${px + 1} ${g.t + 9} Z`} fill={hair.base} {...hairStroke} />
            <path d={`M ${px} ${g.t + 0.5} L ${px + 0.6} ${g.t + 10}`} stroke={skin.shade} strokeWidth="0.9" strokeLinecap="round" />
            <path d={`M ${px + 3} ${g.t + 1} C ${50 + g.w * 0.3} ${g.t - 2} ${50 + g.w * 0.7} ${g.t + 1} ${50 + g.w * 0.85} ${g.t + 7}`} stroke={hair.hi} strokeWidth="1.3" fill="none" opacity="0.65" strokeLinecap="round" />
          </g>
        );
      }
      case 'curtains': {
        // centre parting, two curtains framing the forehead (very mid-90s)
        const curtain = (s: number) =>
          `M 50 ${g.t - 1} C ${50 + s * g.w * 0.5} ${g.t - 1} ${50 + s * (g.w + 1.5)} ${g.t + 4} ${50 + s * (g.w + 1.2)} ${g.t + 20} C ${50 + s * g.w * 0.8} ${g.t + 14} ${50 + s * g.w * 0.45} ${g.t + 15} ${50 + s * 2} ${g.t + 17} C ${50 + s * 3} ${g.t + 10} ${50 + s * 1.5} ${g.t + 4} 50 ${g.t - 1} Z`;
        return (
          <g>
            {hairShadow(g.t + 15, 3, 5)}
            <path d={capPath(g, g.t + 12, 3, 6)} fill={hair.base} />
            <path d={curtain(-1)} fill={`url(#${uid}-hair)`} {...hairStroke} />
            <path d={curtain(1)} fill={`url(#${uid}-hair)`} {...hairStroke} />
            <path d={`M ${50 - 4} ${g.t + 4} Q ${50 - g.w * 0.6} ${g.t + 5} ${50 - g.w * 0.85} ${g.t + 14}`} stroke={hair.hi} strokeWidth="1.1" fill="none" opacity="0.6" />
            <path d={`M ${50 + 4} ${g.t + 4} Q ${50 + g.w * 0.6} ${g.t + 5} ${50 + g.w * 0.85} ${g.t + 14}`} stroke={hair.hi} strokeWidth="1.1" fill="none" opacity="0.6" />
          </g>
        );
      }
      case 'quiff':
        return (
          <g>
            {cap(g.t + 13, 3, 5)}
            <path d={`M ${50 - g.w * 0.8} ${g.t + 6} C ${50 - g.w * 0.6} ${g.t - 14} ${50 + g.w * 0.9} ${g.t - 16} ${50 + g.w * 0.8} ${g.t + 4} C ${50 + g.w * 0.3} ${g.t - 4} ${50 - g.w * 0.3} ${g.t - 2} ${50 - g.w * 0.8} ${g.t + 6} Z`} fill={`url(#${uid}-hair)`} {...hairStroke} />
            <path d={`M ${50 - g.w * 0.4} ${g.t - 3} C ${50} ${g.t - 11} ${50 + g.w * 0.5} ${g.t - 11} ${50 + g.w * 0.7} ${g.t - 2}`} stroke={hair.hi} strokeWidth="1.6" fill="none" opacity="0.7" />
          </g>
        );
      case 'gelled': {
        // wet-look: short faded sides, the top gelled up into glossy points
        const spikes = Array.from({ length: 6 }).map((_, i) => {
          const x = 50 - g.w * 0.62 + i * ((g.w * 1.24) / 5);
          const tip = g.t - 8 + Math.abs(i - 2.5) * 1.8;
          return `M ${x - 4.2} ${g.t + 5} Q ${x - 1} ${g.t - 1} ${x + 1.5} ${tip} Q ${x + 2} ${g.t} ${x + 4.2} ${g.t + 5} Z`;
        });
        return (
          <g>
            <path d={capPath(g, g.t + 14, 0.5, 5)} fill={hair.base} opacity="0.55" />
            <path d={capPath(g, g.t + 14, 0.5, 5)} fill={`url(#${uid}-stubble)`} />
            {hairShadow(g.t + 7, 3, 1)}
            <path d={capPath(g, g.t + 7, 3, 1)} fill={hair.base} {...hairStroke} />
            {spikes.map((d, i) => (
              <path key={i} d={d} fill={`url(#${uid}-hair)`} {...hairStroke} />
            ))}
            {spikes.map((_, i) => {
              const x = 50 - g.w * 0.62 + i * ((g.w * 1.24) / 5);
              return <path key={`s${i}`} d={`M ${x - 0.5} ${g.t + 2} L ${x + 1} ${g.t - 4 + Math.abs(i - 2.5) * 1.6}`} stroke="#fff" strokeWidth="0.8" opacity="0.45" strokeLinecap="round" />;
            })}
          </g>
        );
      }
      case 'frosted':
        // textured curls with bleached tips (early-2000s frosted tips)
        return (
          <g>
            {cap(g.t + 12, 2, 5)}
            {Array.from({ length: 9 }).map((_, i) => {
              const x = 50 - g.w * 0.78 + i * ((g.w * 1.56) / 8);
              const y = g.t + 1 + (i % 2) * 2.5 - (4 - Math.abs(i - 4)) * 0.6;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="3.6" fill={hair.base} stroke={hair.line} strokeWidth="0.5" />
                  <circle cx={x + 0.4} cy={y - 1.3} r="2.1" fill={FROST} />
                </g>
              );
            })}
          </g>
        );
      case 'curly':
        return (
          <g fill={hair.base}>
            {cap(g.t + 12, 2, 6)}
            {Array.from({ length: 11 }).map((_, i) => {
              const a = Math.PI + (i / 10) * Math.PI;
              return <circle key={i} cx={50 + Math.cos(a) * (g.w + 1)} cy={g.t + 12 + Math.sin(a) * 14} r="5.2" stroke={hair.line} strokeWidth="0.5" />;
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
            <path d={`M ${50 - g.w * 0.6} ${g.t - 6} Q 50 ${g.t - 10} ${50 + g.w * 0.4} ${g.t - 7}`} stroke={hair.hi} strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
          </g>
        );
      case 'ponytail':
      case 'slick':
        // pulled straight back from the hairline
        return (
          <g>
            {cap(g.t + 12, 2.5, 5)}
            {[-0.45, -0.15, 0.15, 0.45].map((k) => (
              <path key={k} d={`M ${50 + k * g.w * 1.2} ${g.t + 10} Q ${50 + k * g.w * 0.9} ${g.t + 2} ${50 + k * g.w * 0.6} ${g.t - 1.5}`} stroke={hair.hi} strokeWidth="0.9" fill="none" opacity="0.6" strokeLinecap="round" />
            ))}
          </g>
        );
      case 'mullet':
        return (
          <g>
            {cap(g.t + 13, 3, 6)}
            <path d={`M ${50 - g.w * 0.7} ${g.t + 9} Q 50 ${g.t + 14} ${50 + g.w * 0.6} ${g.t + 8}`} stroke={hair.line} strokeWidth="0.8" fill="none" opacity="0.5" />
            {shine()}
          </g>
        );
      case 'manbun':
        return (
          <g>
            {cap(g.t + 12, 2.5, 5)}
            <ellipse cx="50" cy={g.t - 5} rx="7" ry="6" fill={`url(#${uid}-hair)`} {...hairStroke} />
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
            <path d={capPath(g, g.t + 12, 0, 4)} fill={`url(#${uid}-stubble)`} opacity="0.7" />
            <path d={`M 44 ${g.t + 8} Q 46 ${g.t - 6} 50 ${g.t - 15} Q 54 ${g.t - 6} 56 ${g.t + 8} Z`} fill={`url(#${uid}-hair)`} {...hairStroke} />
            <path d={`M 49 ${g.t - 9} L 50 ${g.t + 4}`} stroke={hair.hi} strokeWidth="1" opacity="0.6" />
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
          <g>
            {cap(g.t + 12, 2, 4)}
            {Array.from({ length: 7 }).map((_, i) => {
              const x = 50 - g.w * 0.85 + i * ((g.w * 1.7) / 6);
              return <path key={i} d={`M ${x - 4} ${g.t + 4} L ${x + (i - 3) * 0.8} ${g.t - 9 + Math.abs(i - 3)} L ${x + 4} ${g.t + 4} Z`} fill={hair.base} {...hairStroke} />;
            })}
          </g>
        );
      case 'fringe':
        return (
          <g>
            {cap(g.t + 18, 3, 3)}
            <path d={`M ${50 - g.w} ${g.t + 15} Q 50 ${g.t + 22} ${50 + g.w} ${g.t + 15} L ${50 + g.w} ${g.t + 10} L ${50 - g.w} ${g.t + 10} Z`} fill={hair.base} />
            {shine(0.45)}
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
    const tache = `M 40.5 ${mouthY - 0.5} C 42 ${mouthY - 6.5} 47 ${mouthY - 7} 50 ${mouthY - 5.5} C 53 ${mouthY - 7} 58 ${mouthY - 6.5} 59.5 ${mouthY - 0.5} C 56 ${mouthY - 2.5} 53 ${mouthY - 3} 50 ${mouthY - 2.5} C 47 ${mouthY - 3} 44 ${mouthY - 2.5} 40.5 ${mouthY - 0.5} Z`;
    switch (fh) {
      case 'stubble':
        return <path d={`${jaw} C ${50 + g.w - 6} ${mouthY - 2} ${50 - g.w + 6} ${mouthY - 2} ${50 - g.w + 1} ${g.m + 2} Z`} fill={`url(#${uid}-stubble)`} opacity="0.85" />;
      case 'goatee':
        // a solid chin beard joined to a moustache, clearly more than stubble
        return (
          <g fill={beardColor} stroke={hair.line} strokeWidth="0.4">
            <path d={`M 43 ${mouthY - 1.5} C 45 ${mouthY - 6} 48 ${mouthY - 6} 50 ${mouthY - 5} C 52 ${mouthY - 6} 55 ${mouthY - 6} 57 ${mouthY - 1.5} C 54 ${mouthY - 3} 52 ${mouthY - 3} 50 ${mouthY - 2.5} C 48 ${mouthY - 3} 46 ${mouthY - 3} 43 ${mouthY - 1.5} Z`} />
            <path d={`M 43.5 ${mouthY - 1} L 44.5 ${mouthY + 4} Q 50 ${g.c + 5} 55.5 ${mouthY + 4} L 56.5 ${mouthY - 1} Q 55 ${mouthY + 3} 50 ${mouthY + 3.8} Q 45 ${mouthY + 3} 43.5 ${mouthY - 1} Z`} />
          </g>
        );
      case 'moustache':
        return <path d={tache} fill={beardColor} stroke={hair.line} strokeWidth="0.4" />;
      case 'beard':
      case 'fullbeard': {
        const full = fh === 'fullbeard';
        const drop = full ? 6 : 2;
        return (
          <g fill={beardColor} stroke={hair.line} strokeWidth="0.4">
            <path
              d={`M ${50 - g.w + 0.5} ${g.m - 2} C ${50 - g.w} ${g.m + 16} ${50 - g.j - 2} ${g.c + drop} 50 ${g.c + drop + 2} C ${50 + g.j + 2} ${g.c + drop} ${50 + g.w} ${g.m + 16} ${50 + g.w - 0.5} ${g.m - 2} L ${50 + g.w - 4} ${g.m + 4} C ${50 + 9} ${mouthY - 4} ${50 - 9} ${mouthY - 4} ${50 - g.w + 4} ${g.m + 4} Z`}
            />
            <path d={tache} />
            {full && <path d={`M ${50 - g.j} ${g.c - 1} Q 50 ${g.c + drop + 1} ${50 + g.j} ${g.c - 1}`} stroke={hair.hi} strokeWidth="0.8" fill="none" opacity="0.4" />}
          </g>
        );
      }
      default:
        return null;
    }
  })();

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
        <radialGradient id={`${uid}-face`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.shade} />
        </radialGradient>
        <linearGradient id={`${uid}-hair`} x1="0" x2="0.3" y1="0" y2="1">
          <stop offset="0%" stopColor={hair.hi} />
          <stop offset="45%" stopColor={hair.base} />
          <stop offset="100%" stopColor={hair.base} />
        </linearGradient>
        <linearGradient id={`${uid}-kitshade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <clipPath id={`${uid}-shirt`}>
          <path d={shirt} />
        </clipPath>
      </defs>

      {/* neck first, so the shirt's neckline frames it */}
      <path d="M 41 70 L 41 79 Q 40.5 83 35 85 L 35 102 L 65 102 L 65 85 Q 59.5 83 59 79 L 59 70 Z" fill={skin.shade} />
      <path d="M 41 74 Q 50 82 59 74 L 59 80 Q 50 86 41 80 Z" fill={skin.line} opacity="0.25" />

      {/* shirt, with the neck opening cut into it */}
      <path d={shirt} fill={kitPrimaryColor} />
      <g clipPath={`url(#${uid}-shirt)`}>
        {/* raglan sleeves in the sleeve colour */}
        <path d="M 4 110 C 6 96 15 89 31 85.4 C 27 93 23 101 22 112 Z" fill={sleeve} />
        <path d="M 96 110 C 94 96 85 89 69 85.4 C 73 93 77 101 78 112 Z" fill={sleeve} />
        <path d="M 31 85.4 C 27 93 23 101 22 112 M 69 85.4 C 73 93 77 101 78 112" stroke="rgba(0,0,0,.22)" strokeWidth="0.7" fill="none" />
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
      <path d={shirt} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="0.8" />
      {acc === 'captainband' && <rect x="12" y="98" width="11" height="5" rx="1" fill="#facc15" stroke="#000" strokeWidth="0.5" transform="rotate(-14 17 100)" />}
      {acc === 'snood' && <path d="M 39 74 L 39 88 Q 50 93 61 88 L 61 74 Q 50 78 39 74 Z" fill="#111" />}

      {hairBack}

      {/* ears */}
      <ellipse cx={50 - g.w - 0.5} cy={eyeY + 2} rx="4" ry="6" fill={skin.shade} />
      <ellipse cx={50 + g.w + 0.5} cy={eyeY + 2} rx="4" ry="6" fill={skin.shade} />
      <path d={`M ${50 - g.w - 1.5} ${eyeY - 1} q -1.5 3 0 6`} stroke={skin.line} strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d={`M ${50 + g.w + 1.5} ${eyeY - 1} q 1.5 3 0 6`} stroke={skin.line} strokeWidth="0.7" fill="none" opacity="0.6" />
      {acc === 'earring' && <circle cx={50 + g.w + 1} cy={eyeY + 8} r="1.6" fill="#f8fafc" stroke="#facc15" strokeWidth="0.6" />}

      {/* head */}
      <path d={headPath(g)} fill={`url(#${uid}-face)`} stroke={skin.line} strokeWidth="0.9" />
      {/* cheeks */}
      <ellipse cx={50 - g.w * 0.6} cy={mouthY - 4} rx="4" ry="2.4" fill={skin.blush} opacity="0.32" />
      <ellipse cx={50 + g.w * 0.6} cy={mouthY - 4} rx="4" ry="2.4" fill={skin.blush} opacity="0.32" />

      {facialHair}

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
