import type { ReactNode } from 'react';

// Simplified, recognisable national flags drawn in SVG (no image files, and no emoji:
// flag emoji show as plain letters on Windows). viewBox is 30 × 20.
const W = 30;
const H = 20;

const hStripes = (cols: string[], weights?: number[]) => {
  const w = weights ?? cols.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let y = 0;
  return cols.map((c, i) => {
    const h = (w[i] / total) * H;
    const el = <rect key={i} x={0} y={y} width={W} height={h + 0.05} fill={c} />;
    y += h;
    return el;
  });
};
const vStripes = (cols: string[]) => cols.map((c, i) => <rect key={i} x={(i * W) / cols.length} y={0} width={W / cols.length + 0.05} height={H} fill={c} />);
const nordic = (bg: string, cross: string, inner?: string) => (
  <>
    <rect width={W} height={H} fill={bg} />
    <rect x={8} y={0} width={inner ? 5 : 3.5} height={H} fill={cross} />
    <rect x={0} y={inner ? 7.5 : 8.25} width={W} height={inner ? 5 : 3.5} fill={cross} />
    {inner && (
      <>
        <rect x={9.25} y={0} width={2.5} height={H} fill={inner} />
        <rect x={0} y={8.75} width={W} height={2.5} fill={inner} />
      </>
    )}
  </>
);
const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
};
const sun = (cx: number, cy: number, r: number) => (
  <g>
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r * 1.7} y2={cy + Math.sin(a) * r * 1.7} stroke="#f6b40e" strokeWidth={0.7} />;
    })}
    <circle cx={cx} cy={cy} r={r} fill="#f6b40e" />
  </g>
);
const crescent = (cx: number, cy: number, r: number, bg: string, fg: string) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={fg} />
    <circle cx={cx + r * 0.3} cy={cy} r={r * 0.8} fill={bg} />
  </>
);
const unionCanton = (
  <g>
    <rect width={15} height={10} fill="#012169" />
    <path d="M0 0 L15 10 M15 0 L0 10" stroke="#fff" strokeWidth={2} />
    <path d="M0 0 L15 10 M15 0 L0 10" stroke="#c8102e" strokeWidth={0.8} />
    <path d="M7.5 0 V10 M0 5 H15" stroke="#fff" strokeWidth={3} />
    <path d="M7.5 0 V10 M0 5 H15" stroke="#c8102e" strokeWidth={1.8} />
  </g>
);

const FLAGS: Record<string, ReactNode> = {
  Algeria: (
    <>
      {vStripes(['#006233', '#ffffff'])}
      {crescent(15.5, 10, 5, '#ffffff', '#d21034')}
      {star(17.5, 10, 2.2, '#d21034')}
    </>
  ),
  Argentina: (
    <>
      {hStripes(['#74acdf', '#ffffff', '#74acdf'])}
      {sun(15, 10, 1.8)}
    </>
  ),
  Australia: (
    <>
      <rect width={W} height={H} fill="#012169" />
      {unionCanton}
      {star(7.5, 15, 2.2, '#fff')}
      {star(23, 4, 1.2, '#fff')}
      {star(20, 9, 1.2, '#fff')}
      {star(26, 8, 1.2, '#fff')}
      {star(23, 16, 1.3, '#fff')}
    </>
  ),
  Austria: hStripes(['#ed2939', '#ffffff', '#ed2939']),
  Barbados: (
    <>
      {vStripes(['#00267f', '#ffc726', '#00267f'])}
      <path d="M15 5 V15 M12.5 6 Q12.5 10 15 10 Q17.5 10 17.5 6" stroke="#000" strokeWidth={1} fill="none" />
    </>
  ),
  Belgium: vStripes(['#000000', '#fdda24', '#ef3340']),
  'Bosnia and Herzegovina': (
    <>
      <rect width={W} height={H} fill="#002395" />
      <polygon points="8,0 22,0 22,20" fill="#fecb00" />
      {[0, 1, 2, 3, 4, 5].map((i) => star(6 + i * 2.6, 1.5 + i * 3.3, 1, '#fff'))}
    </>
  ),
  Brazil: (
    <>
      <rect width={W} height={H} fill="#009c3b" />
      <polygon points="15,2 28,10 15,18 2,10" fill="#ffdf00" />
      <circle cx={15} cy={10} r={4.6} fill="#002776" />
      <path d="M10.6 9 Q15 7.6 19.4 10.4" stroke="#fff" strokeWidth={0.8} fill="none" />
    </>
  ),
  Bulgaria: hStripes(['#ffffff', '#00966e', '#d62612']),
  Cameroon: (
    <>
      {vStripes(['#007a5e', '#ce1126', '#fcd116'])}
      {star(15, 10, 2.6, '#fcd116')}
    </>
  ),
  Chile: (
    <>
      {hStripes(['#ffffff', '#d52b1e'])}
      <rect width={10} height={10} fill="#0039a6" />
      {star(5, 5, 2.4, '#fff')}
    </>
  ),
  Colombia: hStripes(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]),
  Croatia: (
    <>
      {hStripes(['#ff0000', '#ffffff', '#171796'])}
      <rect x={12} y={5} width={6} height={7} fill="#fff" stroke="#ff0000" strokeWidth={0.4} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ((r + c) % 2 === 0 ? <rect key={`${r}${c}`} x={12 + c * 2} y={5 + r * 2.33} width={2} height={2.33} fill="#ff0000" /> : null)))}
    </>
  ),
  'Czech Republic': (
    <>
      {hStripes(['#ffffff', '#d7141a'])}
      <polygon points="0,0 15,10 0,20" fill="#11457e" />
    </>
  ),
  "Côte d'Ivoire": vStripes(['#f77f00', '#ffffff', '#009e60']),
  'DR Congo': (
    <>
      <rect width={W} height={H} fill="#007fff" />
      <polygon points="0,17 24,0 30,0 30,3 6,20 0,20" fill="#f7d618" />
      <polygon points="0,18.3 26,0 30,0 30,1.7 4,20 0,20" fill="#ce1021" />
      {star(5, 4.5, 2.6, '#f7d618')}
    </>
  ),
  Denmark: nordic('#c8102e', '#ffffff'),
  Ecuador: hStripes(['#ffdd00', '#034ea2', '#ed1c24'], [2, 1, 1]),
  Egypt: (
    <>
      {hStripes(['#ce1126', '#ffffff', '#000000'])}
      <circle cx={15} cy={10} r={1.8} fill="#c09300" />
    </>
  ),
  England: (
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <rect x={12.5} y={0} width={5} height={H} fill="#ce1124" />
      <rect x={0} y={7.5} width={W} height={5} fill="#ce1124" />
    </>
  ),
  Finland: nordic('#ffffff', '#002f6c'),
  France: vStripes(['#0055a4', '#ffffff', '#ef4135']),
  Germany: hStripes(['#000000', '#dd0000', '#ffce00']),
  Ghana: (
    <>
      {hStripes(['#ce1126', '#fcd116', '#006b3f'])}
      {star(15, 10, 2.8, '#000')}
    </>
  ),
  Greece: (
    <>
      {hStripes(['#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf'])}
      <rect width={11.1} height={11.1} fill="#0d5eaf" />
      <rect x={4.45} y={0} width={2.2} height={11.1} fill="#fff" />
      <rect x={0} y={4.45} width={11.1} height={2.2} fill="#fff" />
    </>
  ),
  Grenada: (
    <>
      <rect width={W} height={H} fill="#ce1126" />
      <rect x={3} y={3} width={24} height={14} fill="#fcd116" />
      <polygon points="3,3 27,3 15,10" fill="#007a5e" />
      <polygon points="3,17 27,17 15,10" fill="#007a5e" />
      <circle cx={15} cy={10} r={2.2} fill="#ce1126" />
      {star(15, 10, 1.2, '#fcd116')}
    </>
  ),
  Honduras: (
    <>
      {hStripes(['#0073cf', '#ffffff', '#0073cf'])}
      {star(15, 10, 1, '#0073cf')}
      {star(11, 8.5, 0.9, '#0073cf')}
      {star(19, 8.5, 0.9, '#0073cf')}
      {star(11, 11.5, 0.9, '#0073cf')}
      {star(19, 11.5, 0.9, '#0073cf')}
    </>
  ),
  Hungary: hStripes(['#ce2939', '#ffffff', '#477050']),
  Iceland: nordic('#02529c', '#ffffff', '#dc1e35'),
  Italy: vStripes(['#009246', '#ffffff', '#ce2b37']),
  Jamaica: (
    <>
      <rect width={W} height={H} fill="#009b3a" />
      <polygon points="0,0 15,10 0,20" fill="#000" />
      <polygon points="30,0 15,10 30,20" fill="#000" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fed100" strokeWidth={2.6} />
    </>
  ),
  Japan: (
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <circle cx={15} cy={10} r={6} fill="#bc002d" />
    </>
  ),
  Kenya: (
    <>
      {hStripes(['#000000', '#ffffff', '#bb0000', '#ffffff', '#006600'], [6, 1, 6, 1, 6])}
      <ellipse cx={15} cy={10} rx={2.8} ry={6} fill="#bb0000" stroke="#000" strokeWidth={0.6} />
    </>
  ),
  'Korea Republic': (
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <path d="M10 10 A5 5 0 0 1 20 10 A2.5 2.5 0 0 1 15 10 A2.5 2.5 0 0 0 10 10 Z" fill="#cd2e3a" />
      <path d="M10 10 A5 5 0 0 0 20 10 A2.5 2.5 0 0 0 15 10 A2.5 2.5 0 0 1 10 10 Z" fill="#0047a0" />
      {[
        [5, 4, -33],
        [25, 4, 33],
        [5, 16, 33],
        [25, 16, -33],
      ].map(([x, y, a], i) => (
        <g key={i} transform={`rotate(${a} ${x} ${y})`}>
          {[-1.2, 0, 1.2].map((o) => (
            <rect key={o} x={x - 2} y={y + o - 0.35} width={4} height={0.7} fill="#000" />
          ))}
        </g>
      ))}
    </>
  ),
  Mexico: (
    <>
      {vStripes(['#006847', '#ffffff', '#ce1126'])}
      <circle cx={15} cy={10} r={2.2} fill="#8c5a2b" />
    </>
  ),
  Morocco: (
    <>
      <rect width={W} height={H} fill="#c1272d" />
      <polygon points="15,5.5 16.4,9.6 20.6,9.6 17.1,12.1 18.5,16.2 15,13.6 11.5,16.2 12.9,12.1 9.4,9.6 13.6,9.6" fill="none" stroke="#006233" strokeWidth={0.9} />
    </>
  ),
  Netherlands: hStripes(['#ae1c28', '#ffffff', '#21468b']),
  'New Zealand': (
    <>
      <rect width={W} height={H} fill="#012169" />
      {unionCanton}
      {star(23, 4.5, 1.3, '#cc142b')}
      {star(20, 9.5, 1.2, '#cc142b')}
      {star(26, 9, 1.2, '#cc142b')}
      {star(23, 16, 1.4, '#cc142b')}
    </>
  ),
  Nigeria: vStripes(['#008751', '#ffffff', '#008751']),
  'Northern Ireland': (
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#cf142b" strokeWidth={2.4} />
    </>
  ),
  Norway: nordic('#ba0c2f', '#ffffff', '#00205b'),
  Oman: (
    <>
      {hStripes(['#ffffff', '#db161b', '#008000'])}
      <rect width={8} height={H} fill="#db161b" />
    </>
  ),
  Paraguay: hStripes(['#d52b1e', '#ffffff', '#0038a8']),
  Poland: hStripes(['#ffffff', '#dc143c']),
  Portugal: (
    <>
      <rect width={W} height={H} fill="#ff0000" />
      <rect width={12} height={H} fill="#006600" />
      <circle cx={12} cy={10} r={3.6} fill="#ffcc00" />
      <rect x={10.6} y={8} width={2.8} height={3.6} rx={0.6} fill="#ff0000" stroke="#fff" strokeWidth={0.4} />
    </>
  ),
  'Republic of Ireland': vStripes(['#169b62', '#ffffff', '#ff883e']),
  Russia: hStripes(['#ffffff', '#0039a6', '#d52b1e']),
  Scotland: (
    <>
      <rect width={W} height={H} fill="#005eb8" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#ffffff" strokeWidth={3.4} />
    </>
  ),
  Senegal: (
    <>
      {vStripes(['#00853f', '#fdef42', '#e31b23'])}
      {star(15, 10, 2.6, '#00853f')}
    </>
  ),
  Serbia: (
    <>
      {hStripes(['#c6363c', '#0c4076', '#ffffff'])}
      <rect x={7} y={4} width={5} height={8} rx={1.5} fill="#c6363c" stroke="#edb92e" strokeWidth={0.6} />
    </>
  ),
  'South Africa': (
    <>
      {hStripes(['#e03c31', '#ffffff', '#007749', '#ffffff', '#001489'], [6.5, 1.2, 4.6, 1.2, 6.5])}
      <polygon points="0,0 13,10 0,20" fill="#ffffff" />
      <polygon points="0,1.8 10.8,10 0,18.2" fill="#ffb81c" />
      <polygon points="0,3.2 9,10 0,16.8" fill="#000000" />
      <polygon points="0,0 2.6,0 15.5,9 30,9 30,11 15.5,11 2.6,20 0,20 0,18.2 10.8,10 0,1.8" fill="#007749" />
    </>
  ),
  Spain: (
    <>
      {hStripes(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1])}
      <rect x={6.5} y={7} width={3} height={5} rx={0.8} fill="#aa151b" />
    </>
  ),
  Sweden: nordic('#006aa7', '#fecc00'),
  Switzerland: (
    <>
      <rect width={W} height={H} fill="#da291c" />
      <rect x={13.25} y={4} width={3.5} height={12} fill="#fff" />
      <rect x={9} y={8.25} width={12} height={3.5} fill="#fff" />
    </>
  ),
  'Trinidad and Tobago': (
    <>
      <rect width={W} height={H} fill="#ce1126" />
      <polygon points="0,0 7,0 30,15.5 30,20 23,20 0,4.5" fill="#ffffff" />
      <polygon points="1.8,0 5.2,0 30,16.7 30,20 24.8,20 0,3.3 0,1.2" fill="#000000" />
    </>
  ),
  Turkey: (
    <>
      <rect width={W} height={H} fill="#e30a17" />
      {crescent(12, 10, 5, '#e30a17', '#ffffff')}
      {star(17.6, 10, 2, '#ffffff')}
    </>
  ),
  'United States': (
    <>
      {hStripes(Array.from({ length: 13 }, (_, i) => (i % 2 ? '#ffffff' : '#b22234')))}
      <rect width={12} height={10.8} fill="#3c3b6e" />
      {Array.from({ length: 4 }).flatMap((_, r) =>
        Array.from({ length: 5 }).map((__, c) => <circle key={`${r}${c}`} cx={1.4 + c * 2.3} cy={1.4 + r * 2.6} r={0.45} fill="#fff" />),
      )}
    </>
  ),
  Uruguay: (
    <>
      {hStripes(['#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff'])}
      <rect width={11} height={11.1} fill="#ffffff" />
      {sun(5.5, 5.5, 2)}
    </>
  ),
  Venezuela: (
    <>
      {hStripes(['#ffcc00', '#00247d', '#cf142b'])}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = Math.PI * (0.15 + (i * 0.7) / 7);
        return <circle key={i} cx={15 - Math.cos(a) * 5} cy={11.5 - Math.sin(a) * 3.2} r={0.45} fill="#fff" />;
      })}
    </>
  ),
  Wales: (
    <>
      {hStripes(['#ffffff', '#00b140'])}
      <path d="M8 13 Q9 8 13 8.5 L16 6.5 L18 8.5 Q22 7.5 22.5 11 L20.5 10.5 L21 13.5 L18.5 12 Q15 15.5 11.5 13 Z" fill="#d30731" />
    </>
  ),
};

const CODES: Record<string, string> = { 'Korea Republic': 'KOR', 'Republic of Ireland': 'IRL', 'Northern Ireland': 'NIR', 'United States': 'USA', 'DR Congo': 'COD', "Côte d'Ivoire": 'CIV' };

export function hasFlag(nation: string) {
  return nation in FLAGS;
}

/** A nation's flag. Unknown nations get a neutral tile with a 3-letter code. */
export function Flag({ nation, width = 60, className = '' }: { nation: string; width?: number; className?: string }) {
  const flag = FLAGS[nation];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width * H) / W} className={className} role="img" aria-label={`${nation} flag`}>
      {flag ?? (
        <>
          <rect width={W} height={H} fill="#334155" />
          <text x={15} y={13} textAnchor="middle" fontSize={7} fontWeight={800} fill="#fff" fontFamily="Inter, sans-serif">
            {(CODES[nation] ?? nation.slice(0, 3)).toUpperCase()}
          </text>
        </>
      )}
      <rect width={W} height={H} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={0.6} />
    </svg>
  );
}
