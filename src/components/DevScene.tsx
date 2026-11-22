import type { ReactNode } from 'react';

// Hand-made background scenes for the secret dev cards. Each sits behind the portrait,
// under the card's rainbow sheen, so it reads as a subtle theme on the black card.
// Drawn on a 100 x 140 canvas (the card's shape) and scaled to fill it.

export type DevSceneId = 'golf' | 'pizza' | 'pub' | 'monster';

const Golf = () => (
  <>
    <defs>
      <linearGradient id="dv-golf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0b1d33" />
        <stop offset="1" stopColor="#123b2a" />
      </linearGradient>
    </defs>
    <rect width="100" height="140" fill="url(#dv-golf-sky)" />
    {[12, 30, 48, 70, 86].map((x, i) => (
      <circle key={i} cx={x} cy={8 + (i % 3) * 7} r="0.7" fill="#fff" opacity="0.7" />
    ))}
    {/* mown fairway stripes */}
    {Array.from({ length: 7 }).map((_, i) => (
      <path key={i} d={`M ${-20 + i * 20} 140 L ${8 + i * 14} 62 L ${18 + i * 14} 62 L ${0 + i * 20} 140 Z`} fill={i % 2 ? '#1f7a3f' : '#2a9150'} />
    ))}
    {/* the green, the hole and the flag */}
    <ellipse cx="64" cy="70" rx="26" ry="7" fill="#3fb36a" />
    <ellipse cx="70" cy="70" rx="2.2" ry="0.9" fill="#0a0a0a" />
    <line x1="70" y1="70" x2="70" y2="38" stroke="#f8fafc" strokeWidth="1" />
    <path d="M 70 38 L 84 42 L 70 46 Z" fill="#ef4444" />
    {/* bunker */}
    <ellipse cx="24" cy="86" rx="15" ry="4.5" fill="#e9d8a6" />
    {/* golf ball with dimples */}
    <circle cx="20" cy="122" r="7" fill="#f8fafc" />
    {[[-2.5, -2], [1.5, -3], [3.5, 0.5], [-0.5, 1], [-3.5, 2.5], [1, 4]].map(([dx, dy], i) => (
      <circle key={i} cx={20 + dx} cy={122 + dy} r="0.9" fill="#cbd5e1" />
    ))}
  </>
);

const Pizza = () => {
  const pep = (cx: number, cy: number, r: number, k: number) => (
    <g key={k}>
      <circle cx={cx} cy={cy} r={r} fill="#b91c1c" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.2} r={r * 0.22} fill="#7f1d1d" />
      <circle cx={cx + r * 0.35} cy={cy + r * 0.25} r={r * 0.16} fill="#7f1d1d" />
    </g>
  );
  return (
    <>
      <rect width="100" height="140" fill="#1a0f0a" />
      {/* checked tablecloth */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={`c${i}`} x={i * 14} y="0" width="7" height="140" fill="#7f1d1d" opacity="0.35" />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={`r${i}`} x="0" y={i * 14} width="100" height="7" fill="#7f1d1d" opacity="0.35" />
      ))}
      {/* one big pepperoni pizza */}
      <circle cx="50" cy="66" r="44" fill="#c2621b" />
      <circle cx="50" cy="66" r="38" fill="#f4b740" />
      <circle cx="50" cy="66" r="38" fill="#fde68a" opacity="0.35" />
      {[
        [36, 46, 6], [58, 42, 5.5], [70, 60, 6], [44, 66, 5.5], [28, 72, 5], [60, 80, 6], [42, 90, 5], [74, 86, 4.5], [52, 56, 4],
      ].map(([x, y, r], i) => pep(x, y, r, i))}
      {/* a slice being pulled away, with a cheese string */}
      <path d="M 50 66 L 94 52 A 44 44 0 0 1 92 84 Z" fill="#000" opacity="0.55" />
      <path d="M 56 70 L 98 62 A 46 46 0 0 1 95 92 Z" fill="#f4b740" stroke="#c2621b" strokeWidth="3" strokeLinejoin="round" />
      {pep(80, 72, 4.5, 20)}
      <path d="M 54 68 C 60 72 66 70 70 74" stroke="#fde68a" strokeWidth="1.2" fill="none" />
    </>
  );
};

const Pub = () => (
  <>
    {/* wood panelling */}
    <rect width="100" height="140" fill="#2a170b" />
    {Array.from({ length: 7 }).map((_, i) => (
      <rect key={i} x={i * 15} y="0" width="14" height="140" fill={i % 2 ? '#3b2210' : '#331d0d'} />
    ))}
    {/* warm lights */}
    {[18, 50, 82].map((x) => (
      <g key={x}>
        <circle cx={x} cy="20" r="14" fill="#fbbf24" opacity="0.12" />
        <circle cx={x} cy="20" r="3" fill="#fde68a" />
      </g>
    ))}
    {/* bunting */}
    <path d="M 0 8 Q 50 20 100 8" stroke="#e5e7eb" strokeWidth="0.6" fill="none" />
    {Array.from({ length: 9 }).map((_, i) => {
      const x = 4 + i * 11;
      const y = 8 + Math.sin((i / 8) * Math.PI) * 6;
      return <path key={i} d={`M ${x - 4} ${y} L ${x + 4} ${y} L ${x} ${y + 7} Z`} fill={['#ef4444', '#f8fafc', '#2563eb'][i % 3]} />;
    })}
    {/* chalkboard */}
    <rect x="30" y="34" width="40" height="18" rx="1.5" fill="#111827" stroke="#7c4a1e" strokeWidth="1.5" />
    <text x="50" y="42" textAnchor="middle" fontSize="5.2" fill="#f8fafc" fontFamily="Bangers, Impact, sans-serif" fontWeight="400" letterSpacing="0.3">LAST ORDERS</text>
    <text x="50" y="48.5" textAnchor="middle" fontSize="3.4" fill="#fbbf24" fontFamily="Inter, Arial, sans-serif">2 for £10 · quiz tonight</text>
    {/* the bar */}
    <rect x="0" y="104" width="100" height="36" fill="#5b3415" />
    <rect x="0" y="102" width="100" height="4" fill="#8b5a2b" />
    {/* two pints */}
    {[16, 84].map((x) => (
      <g key={x}>
        <path d={`M ${x - 7} 80 L ${x + 7} 80 L ${x + 6} 104 L ${x - 6} 104 Z`} fill="#d97706" opacity="0.9" />
        <path d={`M ${x - 7} 80 L ${x + 7} 80 L ${x + 6.7} 85 L ${x - 6.7} 85 Z`} fill="#fef3c7" />
        <ellipse cx={x} cy="80" rx="7.4" ry="2" fill="#fffbeb" />
        <path d={`M ${x - 4} 88 L ${x - 3.4} 101`} stroke="#fde68a" strokeWidth="0.8" opacity="0.7" />
      </g>
    ))}
  </>
);

// Retro handheld green screen, pixel grass and a generic capture orb (our own design).
const Monster = () => {
  const P = 4; // pixel size
  const grass = [] as ReactNode[];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 25; x++) {
      if ((x + y * 3) % 4 === 0) grass.push(<rect key={`${x}-${y}`} x={x * P} y={112 + y * 6} width={P} height={P + 2} fill="#306230" />);
      if ((x * 7 + y) % 5 === 0) grass.push(<rect key={`h${x}-${y}`} x={x * P + 1} y={110 + y * 6} width={2} height={3} fill="#8bac0f" />);
    }
  return (
    <>
      <rect width="100" height="140" fill="#0f380f" />
      {/* scanlines */}
      {Array.from({ length: 35 }).map((_, i) => (
        <rect key={i} x="0" y={i * 4} width="100" height="1" fill="#000" opacity="0.18" />
      ))}
      <rect x="0" y="104" width="100" height="36" fill="#1d4d1d" />
      {grass}
      {/* capture orb: teal top, violet bottom, gold band */}
      <g transform="translate(78 30)">
        <circle r="13" fill="#7c3aed" />
        <path d="M -13 0 A 13 13 0 0 1 13 0 Z" fill="#14b8a6" />
        <rect x="-13" y="-1.6" width="26" height="3.2" fill="#facc15" />
        <circle r="4.2" fill="#facc15" stroke="#0f380f" strokeWidth="1.2" />
        <circle r="1.8" fill="#fef9c3" />
        <circle cx="-5" cy="-7" r="2.2" fill="#fff" opacity="0.45" />
      </g>
      {/* sparkle stars: something is hiding in the grass */}
      {[
        [20, 96], [36, 102], [58, 98],
      ].map(([x, y], i) => (
        <path key={i} d={`M ${x} ${y - 4} L ${x + 1} ${y - 1} L ${x + 4} ${y} L ${x + 1} ${y + 1} L ${x} ${y + 4} L ${x - 1} ${y + 1} L ${x - 4} ${y} L ${x - 1} ${y - 1} Z`} fill="#9bbc0f" />
      ))}
    </>
  );
};

const SCENES: Record<DevSceneId, () => JSX.Element> = { golf: Golf, pizza: Pizza, pub: Pub, monster: Monster };

export function DevScene({ scene, opacity = 0.55 }: { scene: DevSceneId; opacity?: number }) {
  const S = SCENES[scene];
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }} aria-hidden="true">
      <S />
    </svg>
  );
}
