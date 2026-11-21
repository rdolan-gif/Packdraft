// Original cartoon club icons (our own drawings of each club's nickname or mascot idea, never a real crest).
// 40×40 canvas, navy ink, flat colours, drawn to sit inside a round badge.
import type { JSX } from 'react';

const K = '#161c2b';
const s = { stroke: K, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const eye = (x: number, y: number, r = 1.1) => <circle cx={x} cy={y} r={r} fill={K} />;

/** A small bird body facing right, used as the base for several clubs. */
function bird(body: string, opts: { belly?: string; beak?: string; tail?: JSX.Element; neck?: number; legs?: boolean; wing?: string } = {}) {
  const n = opts.neck ?? 0;
  return (
    <g {...s}>
      {opts.tail}
      <path d={`M 9 24 C 9 16 16 ${14 - n * 0.3} 22 ${16 - n * 0.3} L 24 ${12 - n} C 25 ${7 - n} 31 ${7 - n} 31 ${12 - n} C 31 ${15 - n} 29 17 28 19 C 30 25 26 30 19 30 C 13 30 9 28 9 24 Z`} fill={body} />
      {opts.belly && <path d={`M 15 29 C 22 30 27 26 27 20 C 24 24 19 26 15 29 Z`} fill={opts.belly} />}
      <path d="M 12 22 C 16 19 21 21 22 25 C 18 26 14 26 12 22 Z" fill={opts.wing ?? body} />
      <path d={`M 31 ${10 - n} L 36 ${11.5 - n} L 31 ${13 - n} Z`} fill={opts.beak ?? '#f2a531'} />
      {eye(28.3, 10.6 - n)}
      {opts.legs !== false && <path d="M 17 30 L 16 35 M 21 30 L 22 35 M 14 35 L 18 35 M 20 35 L 24 35" fill="none" />}
    </g>
  );
}

const ICONS: Record<string, () => JSX.Element> = {
  // Arsenal: the cannon
  ARS: () => (
    <g {...s}>
      <path d="M 5 17 L 31 10 L 33 15 L 7 23 Z" fill="#e0b13f" />
      <path d="M 31 9 L 35 8 L 36.5 13.5 L 33 15 Z" fill="#e0b13f" />
      <path d="M 9 26 L 25 24 L 28 31 L 10 32 Z" fill="#9b2c1f" />
      <circle cx="15" cy="29" r="6" fill="#db0007" />
      <circle cx="15" cy="29" r="1.6" fill="#e0b13f" />
      <path d="M 15 23.5 L 15 34.5 M 9.5 29 L 20.5 29" fill="none" />
      <circle cx="5.5" cy="20" r="2.2" fill="#e0b13f" />
    </g>
  ),
  // Manchester United: a little red devil with a trident
  MUN: () => (
    <g {...s}>
      <path d="M 30 7 L 30 35" fill="none" />
      <path d="M 26 9 Q 26 4 30 4 Q 34 4 34 9 M 30 4 L 30 1.5" fill="none" />
      <path d="M 11 12 L 9 4 L 15 9 Z M 25 12 L 27 4 L 21 9 Z" fill="#db0007" />
      <path d="M 7 19 C 7 10 29 10 29 19 C 29 28 22 32 18 32 C 14 32 7 28 7 19 Z" fill="#e0261b" />
      <path d="M 11 17 L 16 19 M 25 17 L 20 19" fill="none" strokeWidth={2} />
      {eye(13.5, 21)}
      {eye(22.5, 21)}
      <path d="M 12 25 Q 18 30 24 25 Q 18 27 12 25 Z" fill="#fff" />
      <path d="M 18 32 L 17 37 L 20 35 Z" fill="#e0261b" />
    </g>
  ),
  // Chelsea: a proud blue lion's head, front on
  CHE: () => (
    <g {...s}>
      <path d="M 37.0 20.0 L 32.5 23.7 L 34.3 29.2 L 28.5 29.8 L 27.1 35.5 L 21.9 32.9 L 17.6 36.8 L 14.6 31.8 L 8.9 32.8 L 9.1 27.0 L 3.7 24.8 L 7.0 20.0 L 3.7 15.2 L 9.1 13.0 L 8.9 7.2 L 14.6 8.2 L 17.6 3.2 L 21.9 7.1 L 27.1 4.5 L 28.5 10.2 L 34.3 10.8 L 32.5 16.3 Z" fill="#034694" />
      <circle cx="11" cy="10" r="3.4" fill="#e0b13f" />
      <circle cx="29" cy="10" r="3.4" fill="#e0b13f" />
      <path d="M 11 18 C 11 10 29 10 29 18 L 29 24 C 29 31 24 33 20 33 C 16 33 11 31 11 24 Z" fill="#e0b13f" />
      <path d="M 14 25 C 14 21 26 21 26 25 C 26 30 23 31 20 31 C 17 31 14 30 14 25 Z" fill="#f6e3b0" />
      {eye(15.5, 18.5)}
      {eye(24.5, 18.5)}
      <path d="M 17.5 22.5 L 22.5 22.5 L 20 25 Z" fill={K} />
      <path d="M 20 25 L 20 26.5 M 17 28 Q 20 29.5 23 28" fill="none" />
    </g>
  ),

  // Liverpool: a long-necked red bird with a sprig in its beak
  LIV: () => (
    <g>
      {bird('#c8102e', { beak: '#f2a531', neck: 4 })}
      <path d="M 35 8 C 37 5 39 7 37 9 M 35.5 9 C 38 10 38 12 36 11.5" stroke="#00a398" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </g>
  ),
  // Manchester City: a sky-blue sailing ship
  MCI: () => (
    <g {...s}>
      <path d="M 5 25 L 35 25 L 31 32 L 9 32 Z" fill="#1c2c5b" />
      <path d="M 20 5 L 20 25 M 11 9 L 11 25" fill="none" />
      <path d="M 20 6 C 27 8 29 15 28 22 L 20 22 Z" fill="#6cabdd" />
      <path d="M 11 10 C 16 12 17 17 16 22 L 11 22 Z" fill="#6cabdd" />
      <path d="M 20 5 L 25 3 L 20 1.5" fill="#ffc659" />
      <path d="M 3 35 Q 8 32 13 35 T 23 35 T 33 35 T 39 34" fill="none" stroke="#3a7bd5" />
    </g>
  ),
  // Tottenham: a cockerel standing on a ball
  TOT: () => (
    <g {...s}>
      <path d="M 9 14 C 4 12 3 6 7 4 C 7 9 10 11 12 12" fill="#132257" />
      {bird('#132257', { belly: '#ffffff', beak: '#e0b13f', legs: false })}
      <path d="M 25 7 Q 26 3 28 5 Q 29 2 31 5 Q 33 4 32 8 Z" fill="#db0007" stroke={K} strokeWidth={1.2} />
      <path d="M 18 30 L 18 33 M 22 30 L 22 33" stroke={K} strokeWidth={1.6} />
      <circle cx="20" cy="36" r="3.5" fill="#fff" stroke={K} strokeWidth={1.4} />
    </g>
  ),
  // Everton: the round tower
  EVE: () => (
    <g {...s}>
      <path d="M 11 15 L 29 15 L 29 34 L 11 34 Z" fill="#f4f1ea" />
      <path d="M 9 15 L 20 4 L 31 15 Z" fill="#003399" />
      <path d="M 18 34 L 18 27 Q 20 24 22 27 L 22 34 Z" fill="#003399" />
      <path d="M 14 19 L 14 23 M 26 19 L 26 23 M 11 25 L 29 25" fill="none" />
      <path d="M 20 4 L 20 1.5" fill="none" />
    </g>
  ),
  // Newcastle: a magpie
  NEW: () => (
    <g>
      {bird('#151515', { belly: '#ffffff', beak: '#3a3a3a', wing: '#ffffff', tail: <path d="M 10 25 L 2 31 L 4 33 L 12 28 Z" fill="#151515" stroke={K} strokeWidth={1.6} strokeLinejoin="round" /> })}
    </g>
  ),
  // Aston Villa: a roaring lion in profile, claret and gold
  AVL: () => (
    <g {...s}>
      <path d="M 33.2 25.0 L 26.8 26.9 L 27.2 33.6 L 20.9 31.4 L 17.2 37.0 L 13.5 31.5 L 7.2 33.9 L 7.4 27.2 L 0.9 25.5 L 5.0 20.2 L 0.8 15.0 L 7.2 13.1 L 6.8 6.4 L 13.1 8.6 L 16.8 3.0 L 20.5 8.5 L 26.8 6.1 L 26.6 12.8 L 33.1 14.5 L 29.0 19.8 Z" fill="#670e36" />
      <circle cx="14" cy="10" r="3.2" fill="#f4c542" />
      <path d="M 10 16 C 13 9 24 9 28 13 L 36 16 L 34 20 L 28 20.5 L 33 23 L 31 27 C 26 30 17 31 12 27 C 9 24 8 20 10 16 Z" fill="#f4c542" />
      <path d="M 28 20.5 L 34 20 L 33 23 Z" fill="#8a1c1c" />
      <path d="M 29.5 20.4 L 30 21.8 L 31 20.3 M 30.5 22.4 L 31 21.3 L 32 22.7" fill="#fff" strokeWidth={0.8} />
      <path d="M 21 13.5 L 27 12.5" fill="none" strokeWidth={2} />
      {eye(24.5, 15.5)}
      <path d="M 35 15.5 L 36.5 17" fill="none" />
      <path d="M 14 21 Q 17 23 19 21 M 15 25 Q 18 27 21 25" fill="none" strokeWidth={1.2} />
    </g>
  ),

  // West Ham: crossed hammers
  WHU: () => (
    <g {...s}>
      <path d="M 9 33 L 27 11 M 31 33 L 13 11" fill="none" stroke="#8a5a2b" strokeWidth={3.2} />
      <path d="M 9 33 L 27 11 M 31 33 L 13 11" fill="none" stroke={K} strokeWidth={0.6} opacity={0} />
      <path d="M 22 6 L 33 15 L 30 18 L 19 9 Z" fill="#7a263a" />
      <path d="M 18 6 L 7 15 L 10 18 L 21 9 Z" fill="#1bb1e7" />
    </g>
  ),
  // Leicester: a fox's head
  LEI: () => (
    <g {...s}>
      <path d="M 7 5 L 15 12 L 25 12 L 33 5 L 32 17 C 32 24 26 29 20 35 C 14 29 8 24 8 17 Z" fill="#e86a1e" />
      <path d="M 12 20 C 15 20 18 24 20 35 C 22 24 25 20 28 20 C 26 27 23 31 20 35 C 17 31 14 27 12 20 Z" fill="#fff" />
      <path d="M 10 9 L 14 13 L 11 15 Z M 30 9 L 26 13 L 29 15 Z" fill="#3a1f0f" />
      {eye(15.5, 18)}
      {eye(24.5, 18)}
      <circle cx="20" cy="33" r="1.8" fill={K} />
    </g>
  ),
  // Southampton: a striped ball wearing a halo (the Saints)
  SOU: () => (
    <g {...s}>
      <ellipse cx="20" cy="7" rx="9" ry="3" fill="none" stroke="#f2c230" strokeWidth={2.4} />
      <circle cx="20" cy="24" r="12" fill="#fff" />
      <path d="M 14 13.5 L 14 34.5 M 20 12 L 20 36 M 26 13.5 L 26 34.5" fill="none" stroke="#d71920" strokeWidth={3.2} />
      <circle cx="20" cy="24" r="12" fill="none" />
    </g>
  ),
  // Blackburn: a red rose
  BLB: () => (
    <g {...s}>
      <path d="M 20 34 L 20 26" fill="none" stroke="#2e7d32" strokeWidth={2} />
      <path d="M 20 30 C 25 27 28 30 27 33 C 24 34 22 32 20 30 Z" fill="#2e7d32" />
      <circle cx="20" cy="16" r="11" fill="#d7263d" />
      <path d="M 20 9 C 26 9 27 16 22 18 C 18 19 15 16 17 13 C 19 11 22 13 21 15" fill="none" />
      <path d="M 10 18 C 13 22 17 23 20 22 M 30 18 C 27 22 23 23 20 22" fill="none" />
    </g>
  ),
  // Bolton: an elephant
  BOL: () => (
    <g {...s}>
      <path d="M 9 28 C 5 18 13 10 22 11 C 29 11 34 16 33 23 C 35 26 36 30 34 34 L 31 34 C 32 31 31 28 29 27 L 28 34 L 24 34 L 24 28 L 15 28 L 15 34 L 11 34 Z" fill="#9aa3b5" />
      <path d="M 22 14 C 16 13 14 19 17 23 C 19 25 23 24 24 21" fill="#b8c0cf" />
      {eye(28, 17)}
      <path d="M 30 22 L 28 23" fill="none" />
    </g>
  ),
  // Stoke: a potter's jug (the Potters)
  STK: () => (
    <g {...s}>
      <path d="M 13 9 L 25 9 L 24 13 C 31 16 31 30 25 34 L 13 34 C 7 30 7 16 14 13 Z" fill="#e03a3e" />
      <path d="M 10 19 L 28 19 M 9.5 24 L 28.5 24 M 10 29 L 28 29" fill="none" stroke="#fff" strokeWidth={2.2} />
      <path d="M 28 16 C 35 15 36 25 29 27" fill="none" strokeWidth={2.2} />
      <path d="M 13 9 L 25 9 L 24 13 C 31 16 31 30 25 34 L 13 34 C 7 30 7 16 14 13 Z" fill="none" />
    </g>
  ),
  // Swansea: a swan on the water
  SWA: () => (
    <g {...s}>
      <path d="M 6 26 C 8 32 26 34 32 27 C 30 24 24 22 18 24 C 21 19 21 13 19 10 C 18 7 22 5 24 7 L 28 9 L 24 10 C 22 12 25 19 23 24 C 18 22 10 21 6 26 Z" fill="#fff" />
      <path d="M 24 7 L 28 9 L 24 10 Z" fill="#f28c28" />
      {eye(22.8, 8.2, 0.9)}
      <path d="M 3 35 Q 8 32 13 35 T 23 35 T 33 35 T 39 34" fill="none" stroke="#3a7bd5" />
    </g>
  ),
  // QPR: a hooped ball (the Hoops)
  QPR: () => (
    <g {...s}>
      <circle cx="20" cy="20" r="14" fill="#fff" />
      <path d="M 7 15 L 33 15 M 6 22 L 34 22 M 9 29 L 31 29" fill="none" stroke="#1d5ba4" strokeWidth={4} strokeLinecap="butt" />
      <circle cx="20" cy="20" r="14" fill="none" />
    </g>
  ),
  // Crystal Palace: an eagle, wings spread
  CRY: () => (
    <g {...s}>
      <path d="M 20 14 C 14 8 8 9 2 10 C 6 13 6 15 4 17 C 8 18 9 20 8 22 C 12 21 15 22 17 24 Z" fill="#1b458f" />
      <path d="M 20 14 C 26 8 32 9 38 10 C 34 13 34 15 36 17 C 32 18 31 20 32 22 C 28 21 25 22 23 24 Z" fill="#1b458f" />
      <path d="M 16 14 C 16 8 24 8 24 14 L 24 28 L 20 34 L 16 28 Z" fill="#c4122e" />
      <path d="M 16.5 11 C 16 4 24 4 23.5 10 L 23 13 L 17 13 Z" fill="#fff" />
      <path d="M 22.5 7.5 L 28 9 C 28 11.5 26 12 23 11 Z" fill="#f2c230" />
      {eye(20.8, 8, 1)}
    </g>
  ),
  // Leeds: a peacock (the old nickname)
  LEE: () => (
    <g {...s}>
      <path d="M 20 30 C 5 32 1 18 6 10 C 11 3 29 3 34 10 C 39 18 35 32 20 30 Z" fill="#1d428a" />
      {[[10, 12], [16, 8], [24, 8], [30, 12], [8, 20], [32, 20]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={2.6} fill="#ffcd00" strokeWidth={1.1} />
          <circle cx={x} cy={y} r={1} fill="#1d428a" stroke="none" />
        </g>
      ))}
      <path d="M 17 32 C 15 26 16 18 19 15 C 20 13 23 13 23 16 L 26 16 L 23 18 C 23 24 24 28 23 32 Z" fill="#fff" />
      {eye(21.3, 15.6, 0.9)}
    </g>
  ),
  // Portsmouth: a crescent moon and star
  POR: () => (
    <g {...s}>
      <path d="M 25 6 C 15 4 7 12 8 21 C 9 31 20 36 28 32 C 20 32 14 26 14 19 C 14 12 19 7 25 6 Z" fill="#f2c230" />
      <path d="M 27 11 L 28.6 15.6 L 33.5 15.7 L 29.6 18.6 L 31 23.3 L 27 20.5 L 23 23.3 L 24.4 18.6 L 20.5 15.7 L 25.4 15.6 Z" fill="#f2c230" />
    </g>
  ),
  // Fulham: the cottage
  FUL: () => (
    <g {...s}>
      <path d="M 7 19 L 33 19 L 33 34 L 7 34 Z" fill="#f4f1ea" />
      <path d="M 4 20 L 20 7 L 36 20 Z" fill="#151515" />
      <path d="M 26 12 L 26 6 L 30 6 L 30 15" fill="#c8102e" />
      <path d="M 17 34 L 17 26 L 23 26 L 23 34 Z" fill="#c8102e" />
      <path d="M 10 23 L 14 23 L 14 27 L 10 27 Z M 26 23 L 30 23 L 30 27 L 26 27 Z" fill="#9fd4ec" />
    </g>
  ),
  // Sunderland: a black cat
  SUN: () => (
    <g {...s}>
      <path d="M 29 33 C 37 32 37 24 33 22" fill="none" stroke={K} strokeWidth={3} />
      <path d="M 11 34 C 9 26 11 21 15 19 L 25 19 C 29 21 31 26 29 34 Z" fill="#1b1b1b" />
      <path d="M 10 9 L 12 2 L 17 7 L 23 7 L 28 2 L 30 9 C 32 14 29 20 20 20 C 11 20 8 14 10 9 Z" fill="#1b1b1b" />
      <circle cx="16" cy="12" r="2" fill="#f2c230" stroke="none" />
      <circle cx="24" cy="12" r="2" fill="#f2c230" stroke="none" />
      <path d="M 16 11 L 16 13 M 24 11 L 24 13" stroke={K} strokeWidth={1} />
      <path d="M 19 16 L 21 16 L 20 17 Z" fill="#e94d7a" stroke="none" />
      <path d="M 6 14 L 13 15 M 6 17 L 13 16.5 M 34 14 L 27 15 M 34 17 L 27 16.5" stroke="#fff" strokeWidth={0.8} />
    </g>
  ),
  // Middlesbrough: the transporter bridge
  MID: () => (
    <g {...s}>
      <path d="M 3 10 L 37 10 L 37 14 L 3 14 Z" fill="#e2001a" />
      <path d="M 7 14 L 5 34 M 11 14 L 12 34 M 29 14 L 28 34 M 33 14 L 35 34 M 7 18 L 11 22 L 7 26 L 11 30 M 33 18 L 29 22 L 33 26 L 29 30" fill="none" stroke="#e2001a" strokeWidth={1.8} />
      <path d="M 18 14 L 18 23 M 22 14 L 22 23" fill="none" />
      <path d="M 15 23 L 25 23 L 25 27 L 15 27 Z" fill="#f4f1ea" />
      <path d="M 1 33 Q 8 30 15 33 T 29 33 T 39 32" fill="none" stroke="#3a7bd5" />
    </g>
  ),
  // Wigan: a pie
  WIG: () => (
    <g {...s}>
      <path d="M 14 9 Q 12 6 14 3 M 20 8 Q 18 5 20 2 M 26 9 Q 24 6 26 3" fill="none" stroke="#9aa3b5" />
      <path d="M 6 22 L 9 33 C 15 35 25 35 31 33 L 34 22 Z" fill="#b5651d" />
      <path d="M 10 24 L 11 32 M 16 25 L 16.5 33.5 M 24 25 L 23.5 33.5 M 30 24 L 29 32" fill="none" strokeWidth={1.1} />
      <ellipse cx="20" cy="20" rx="15" ry="7" fill="#e8b25e" />
      <path d="M 14 18 L 17 21 M 20 16.5 L 20 21 M 26 18 L 23 21" fill="none" strokeWidth={1.3} />
    </g>
  ),
  // West Brom: a throstle on a branch
  WBA: () => (
    <g>
      <path d="M 2 33 C 12 31 24 33 38 29" stroke="#6b4423" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M 30 30 C 33 25 37 26 36 28 Z M 8 32 C 6 28 2 28 3 31 Z" fill="#2e7d32" stroke={K} strokeWidth={1.2} />
      {bird('#8a6a45', { belly: '#f1e3c4', beak: '#f2a531', legs: false })}
      <path d="M 18 29 L 18 32 M 22 29 L 22 32" stroke={K} strokeWidth={1.4} />
      {[[19, 23], [22, 26], [24, 22]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.9} fill="#5a3d1f" />
      ))}
    </g>
  ),
  // Brighton: a seagull in flight
  BRI: () => (
    <g {...s}>
      <path d="M 2 14 C 8 10 14 11 18 17 C 21 13 24 12 27 13 L 31 11 L 30 15 C 33 14 36 12 38 9 C 37 17 31 22 25 22 C 23 25 18 26 15 23 C 12 18 7 15 2 14 Z" fill="#fff" />
      <path d="M 2 14 C 5 13 7 13 9 14 L 7 16 Z M 38 9 C 37 11 36 12 34 13 L 36 14 Z" fill="#0057b8" strokeWidth={1.1} />
      <path d="M 31 11 L 35 12.5 L 31 14 Z" fill="#f2c230" />
      {eye(28.6, 12.6, 0.9)}
    </g>
  ),
  // PackDraft dev team: our own torn-pack shield
  DEV: () => (
    <g {...s}>
      <path d="M 7 6 L 13 9 L 20 4 L 27 9 L 33 6 L 33 22 C 33 29 27 33 20 36 C 13 33 7 29 7 22 Z" fill="#151a26" stroke="#ff6a2b" strokeWidth={2.2} />
      <text x="20" y="27" textAnchor="middle" fontFamily="Saira Extra Condensed, sans-serif" fontWeight={800} fontSize="15" fill="#ff6a2b" stroke="none">
        38
      </text>
    </g>
  ),
  // Wolves: a wolf's head
  WOL: () => (
    <g {...s}>
      <path d="M 8 4 L 15 11 L 25 11 L 32 4 L 33 16 L 36 19 L 30 22 C 28 30 24 35 20 36 C 16 35 12 30 10 22 L 4 19 L 7 16 Z" fill="#fdb913" />
      <path d="M 14 22 C 17 21 23 21 26 22 C 25 28 23 33 20 35 C 17 33 15 28 14 22 Z" fill="#231f20" />
      <path d="M 12 15 L 17 17 M 28 15 L 23 17" fill="none" strokeWidth={2} />
      {eye(15, 18)}
      {eye(25, 18)}
      <path d="M 18 24 L 22 24 L 20 26.5 Z" fill="#fdb913" />
    </g>
  ),
  // Nottingham Forest: a big oak tree
  NFO: () => (
    <g {...s}>
      <path d="M 17 36 L 18 24 L 14 20 M 18 24 L 23 21 M 23 36 L 22 24" fill="none" stroke="#6b4423" strokeWidth={2.4} />
      <path d="M 10 22 C 3 22 3 13 9 12 C 9 5 17 3 20 7 C 24 2 33 5 31 12 C 37 13 37 22 30 22 C 27 26 22 25 20 23 C 17 26 12 26 10 22 Z" fill="#dd0000" />
      <path d="M 14 36 L 26 36" fill="none" />
    </g>
  ),
  // Brentford: a bee
  BRE: () => (
    <g {...s}>
      <ellipse cx="13" cy="13" rx="6" ry="8" fill="#e3f2fd" transform="rotate(-25 13 13)" />
      <ellipse cx="27" cy="13" rx="6" ry="8" fill="#e3f2fd" transform="rotate(25 27 13)" />
      <ellipse cx="20" cy="25" rx="10" ry="8" fill="#f2c230" />
      <path d="M 15 18.5 L 15 31.5 M 21 17 L 21 33 M 27 19 L 27 31" fill="none" strokeWidth={2.4} />
      <path d="M 30 25 L 35 25.5 L 30 27" fill={K} />
      <circle cx="8" cy="23" r="4.5" fill="#e30613" />
      {eye(7, 22, 0.9)}
    </g>
  ),
  // Bournemouth: a pair of cherries
  BOU: () => (
    <g {...s}>
      <path d="M 13 25 C 15 15 20 9 24 5 C 25 12 27 18 27 25" fill="none" stroke="#2e7d32" strokeWidth={1.8} />
      <path d="M 24 5 C 28 2 34 4 35 8 C 31 10 27 9 24 5 Z" fill="#2e7d32" />
      <circle cx="12" cy="27" r="7" fill="#da291c" />
      <circle cx="27" cy="28" r="7" fill="#da291c" />
      <path d="M 9 24 Q 10 22 12 22 M 24 25 Q 25 23 27 23" fill="none" stroke="#fff" strokeWidth={1.4} />
    </g>
  ),
  // Norwich: a canary
  NOR: () => <g>{bird('#fff200', { belly: '#fff9a6', beak: '#f28c28', wing: '#e6d800', tail: <path d="M 10 24 L 3 26 L 5 29 L 11 27 Z" fill="#00a650" stroke={K} strokeWidth={1.6} strokeLinejoin="round" /> })}</g>,
  // Watford: a hornet
  WAT: () => (
    <g {...s}>
      <ellipse cx="14" cy="11" rx="5" ry="8" fill="#e3f2fd" transform="rotate(-35 14 11)" />
      <ellipse cx="25" cy="10" rx="5" ry="8" fill="#e3f2fd" transform="rotate(30 25 10)" />
      <path d="M 8 22 C 8 16 22 15 30 20 C 35 23 37 27 38 30 C 32 30 28 29 24 28 C 16 29 8 28 8 22 Z" fill="#fbee23" />
      <path d="M 15 17 L 14 28 M 21 17 L 20 28.5 M 27 19 L 26 28.5" fill="none" strokeWidth={2.4} />
      <circle cx="7" cy="20" r="4.6" fill="#ed2127" />
      <path d="M 4 16 L 2 12 M 7 15.5 L 7 11" fill="none" />
      {eye(5.8, 19.5, 0.9)}
    </g>
  ),
  // Birmingham: a globe (the Blues)
  BIR: () => (
    <g {...s}>
      <circle cx="20" cy="20" r="14" fill="#0000ff" />
      <path d="M 12 11 C 16 12 15 16 19 17 C 22 18 19 23 15 22 C 12 21 11 17 9 16 Z M 23 23 C 27 22 31 24 30 28 C 28 31 24 31 22 28 Z M 22 8 C 25 8 28 10 27 13 C 25 14 23 11 22 8 Z" fill="#3ec36b" strokeWidth={1.1} />
      <path d="M 6 20 L 34 20 M 20 6 C 13 12 13 28 20 34 C 27 28 27 12 20 6" fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.6} />
    </g>
  ),
  // Charlton: a cutlass
  CHA: () => (
    <g {...s}>
      <path d="M 12 29 C 16 20 24 9 34 4 C 33 13 24 25 15 31 Z" fill="#dfe3ea" />
      <path d="M 9 26 C 12 30 15 32 18 33 L 16 35 C 12 34 9 31 7 28 Z" fill="#d4af37" />
      <path d="M 12 32 L 6 38" fill="none" stroke="#e0001b" strokeWidth={3.4} />
      <path d="M 16 27 C 22 21 27 14 31 8" fill="none" stroke="#fff" strokeWidth={1} />
    </g>
  ),
  // Hull: a tiger's face
  HUL: () => (
    <g {...s}>
      <path d="M 8 8 L 12 4 L 16 8 L 24 8 L 28 4 L 32 8 C 36 14 36 24 32 29 C 28 34 24 36 20 36 C 16 36 12 34 8 29 C 4 24 4 14 8 8 Z" fill="#f5a12d" />
      <path d="M 14 26 C 16 23 24 23 26 26 C 26 31 23 34 20 34 C 17 34 14 31 14 26 Z" fill="#fff" />
      <path d="M 20 9 L 20 14 M 16 9.5 L 17 13 M 24 9.5 L 23 13 M 6 17 L 11 18 M 6 22 L 11 21.5 M 34 17 L 29 18 M 34 22 L 29 21.5" fill="none" strokeWidth={2.2} />
      {eye(15, 19)}
      {eye(25, 19)}
      <path d="M 18 25 L 22 25 L 20 27.5 Z" fill={K} />
    </g>
  ),
  // Wimbledon: a double-headed eagle
  WIM: () => (
    <g {...s}>
      <path d="M 16 18 C 10 13 4 15 2 21 L 6 21 L 3 26 L 8 25 L 6 30 L 12 27 L 16 25 Z" fill="#f2c230" />
      <path d="M 24 18 C 30 13 36 15 38 21 L 34 21 L 37 26 L 32 25 L 34 30 L 28 27 L 24 25 Z" fill="#f2c230" />
      <path d="M 17 15 C 16 11 14 10 12 10 M 23 15 C 24 11 26 10 28 10" fill="none" stroke="#1d3f8f" strokeWidth={4} />
      <path d="M 15 16 C 15 12 25 12 25 16 L 24 28 L 20 34 L 16 28 Z" fill="#1d3f8f" />
      <circle cx="11" cy="8.5" r="3.6" fill="#1d3f8f" />
      <circle cx="29" cy="8.5" r="3.6" fill="#1d3f8f" />
      <path d="M 7.8 7.5 L 4 9 L 7.8 10.2 Z M 32.2 7.5 L 36 9 L 32.2 10.2 Z" fill="#f2c230" />
      <circle cx="10.5" cy="7.8" r="0.9" fill="#fff" stroke="none" />
      <circle cx="29.5" cy="7.8" r="0.9" fill="#fff" stroke="none" />
      <path d="M 18 29 L 17 34 M 22 29 L 23 34" fill="none" />
    </g>
  ),

};

export function ClubIcon({ code, size = 32, ring = '#ffffff' }: { code: string; size?: number; ring?: string }) {
  const draw = ICONS[code];
  return (
    <svg viewBox="-3 -3 46 46" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="21.5" fill={ring} stroke={K} strokeWidth="2.2" />
      {draw ? draw() : <text x="20" y="25" textAnchor="middle" fontSize="12" fontWeight={800}>{code}</text>}
    </svg>
  );
}

export const CLUB_ICON_CODES = Object.keys(ICONS);
