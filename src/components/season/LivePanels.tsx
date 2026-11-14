import { memo, useMemo, useState } from 'react';
import type { TableRow } from '../../types/game';
import { formatMinute, type SeasonSim, TOTAL_MATCHWEEKS, USER_TEAM_ID } from '../../engine/seasonSimulator';
import { type LiveMatchweek, scoresAt } from '../../engine/liveMatch';

const swatch = (a: string, b: string) => ({ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` });
const colours = (sim: SeasonSim, id: string) => {
  const t = sim.teamById[id];
  return t.isUser ? { p: '#10b981', s: '#facc15' } : { p: t.primary, s: t.secondary };
};

// ───────────────────────────── around the grounds ─────────────────────────────

/** Every other match, ticking live. On the final day, matches that matter for the title or the drop come first. */
export function AroundTheGrounds({ sim, live, minute, flashes, before }: { sim: SeasonSim; live: LiveMatchweek | null; minute: number; flashes: Record<number, number>; before: Record<string, TableRow> | null }) {
  const results = live?.results ?? sim.results[sim.matchweek - 1] ?? [];
  const scores = live ? scoresAt(live, minute) : results.map((r) => [r.homeGoals, r.awayGoals] as [number, number]);
  const finalDay = (live?.mw ?? sim.matchweek) === TOTAL_MATCHWEEKS;
  const tag = useMemo(() => {
    const out: Record<string, 'title' | 'drop' | undefined> = {};
    if (!finalDay || !before) return out;
    const rows = Object.values(before).sort((a, b) => b.points - a.points);
    const top = rows[0].points;
    const safe = rows[16].points;
    rows.forEach((r, i) => {
      if (top - r.points <= 3) out[r.teamId] = 'title';
      else if (i >= 15 && Math.abs(r.points - safe) <= 3) out[r.teamId] = 'drop';
    });
    return out;
  }, [finalDay, before]);
  const list = results
    .map((r, i) => ({ r, i, score: scores[i], t: tag[r.homeId] ?? tag[r.awayId] }))
    .filter((x) => !x.r.involvesUser)
    .sort((a, b) => (finalDay ? Number(!!b.t) - Number(!!a.t) : 0));

  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-3">
      <h3 className="mb-2 flex items-center justify-between font-display text-xl text-white">
        {finalDay ? 'FINAL DAY · EVERY GROUND' : 'AROUND THE GROUNDS'}
        {live && minute < live.end && <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live</span>}
      </h3>
      {list.length === 0 && <div className="py-6 text-center text-xs text-white/50">Scores from every ground appear here once the season kicks off.</div>}
      <div className="flex flex-col gap-1">
        {list.map(({ r, i, score, t }) => {
          const h = sim.teamById[r.homeId];
          const a = sim.teamById[r.awayId];
          const hot = flashes[i] !== undefined && minute - flashes[i] < 7;
          return (
            <div key={i} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors duration-300 ${hot ? 'bg-yellow-300/25 ring-1 ring-yellow-300' : t === 'title' ? 'bg-yellow-300/[0.07]' : t === 'drop' ? 'bg-rose-500/[0.08]' : 'bg-white/[0.03]'}`}>
              <span className="flex min-w-0 items-center justify-end gap-1.5 text-right text-white/85">
                <span className="truncate">{h.name}</span>
                <span className="h-3 w-3 shrink-0 rounded-sm" style={swatch(h.primary, h.secondary)} />
              </span>
              <span className={`min-w-[44px] rounded px-1.5 text-center font-display text-base leading-tight tabular-nums ${hot ? 'bg-yellow-300 text-black' : 'bg-black/60 text-white'}`}>
                {score[0]}-{score[1]}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-white/85">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={swatch(a.primary, a.secondary)} />
                <span className="truncate">{a.name}</span>
                {t && <span className={`ml-auto shrink-0 rounded px-1 text-[8px] font-black uppercase ${t === 'title' ? 'bg-yellow-300 text-black' : 'bg-rose-500 text-white'}`}>{t === 'title' ? 'Title' : 'Drop'}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ───────────────────────────── live table ─────────────────────────────

const ROW_H = 28;

export function LiveTable({ sim, rows, before, live }: { sim: SeasonSim; rows: TableRow[]; before: Record<string, TableRow> | null; live: boolean }) {
  // Movement since the start of this matchweek.
  const prevPos = useMemo(() => {
    if (!before) return null;
    const sorted = Object.values(before).sort(
      (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || sim.teamById[a.teamId].name.localeCompare(sim.teamById[b.teamId].name),
    );
    return Object.fromEntries(sorted.map((r, i) => [r.teamId, i + 1]));
  }, [before, sim]);
  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-2 sm:p-3">
      <h3 className="mb-1 flex items-center justify-between px-1 font-display text-xl text-white">
        <span>
          LEAGUE TABLE {live && <span className="ml-1 rounded bg-red-600 px-1.5 align-middle font-sans text-[10px] font-black tracking-widest text-white">AS IT STANDS</span>}
        </span>
        <span className="flex gap-2 text-[9px] font-black uppercase tracking-wider">
          <span className="text-yellow-300">■ Title</span>
          <span className="text-sky-400">■ UCL</span>
          <span className="text-rose-500">■ Drop</span>
        </span>
      </h3>
      <div className="grid grid-cols-[24px_14px_1fr_22px_22px_22px_22px_32px_30px] gap-1 px-2 pb-1 text-[10px] font-black uppercase text-white/40 sm:grid-cols-[24px_14px_1fr_22px_22px_22px_22px_26px_26px_32px_30px_64px]">
        <span>#</span>
        <span />
        <span>Club</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="hidden text-center sm:block">GF</span>
        <span className="hidden text-center sm:block">GA</span>
        <span className="text-center">GD</span>
        <span className="text-center">Pts</span>
        <span className="hidden text-center sm:block">Form</span>
      </div>
      <div className="relative" style={{ height: ROW_H * rows.length }}>
        {rows.map((row, idx) => {
          const team = sim.teamById[row.teamId];
          const pos = idx + 1;
          const was = prevPos?.[row.teamId];
          const move = was ? was - pos : 0;
          const zone = pos === 1 ? 'border-l-yellow-300' : pos <= 4 ? 'border-l-sky-400' : pos >= 18 ? 'border-l-rose-500' : 'border-l-transparent';
          const c = colours(sim, row.teamId);
          return (
            <div
              key={row.teamId}
              className={`row-move absolute inset-x-0 grid grid-cols-[24px_14px_1fr_22px_22px_22px_22px_32px_30px] items-center gap-1 rounded-md border-l-4 px-2 text-xs sm:grid-cols-[24px_14px_1fr_22px_22px_22px_22px_26px_26px_32px_30px_64px] ${zone} ${
                team.isUser ? 'bg-gradient-to-r from-emerald-500/35 via-emerald-500/20 to-yellow-400/20 font-black text-white ring-1 ring-yellow-300/60' : idx % 2 ? 'bg-white/[0.03] text-white/85' : 'text-white/85'
              }`}
              style={{ transform: `translateY(${idx * ROW_H}px)`, height: ROW_H - 2 }}
            >
              <span className={`font-black ${pos === 1 ? 'text-yellow-300' : 'text-white/60'}`}>{pos}</span>
              <span className={`text-[9px] font-black ${move > 0 ? 'text-emerald-400' : move < 0 ? 'text-rose-400' : 'text-transparent'}`}>{move > 0 ? '▲' : move < 0 ? '▼' : '•'}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-3 w-3 shrink-0 rounded-sm border border-black/40" style={swatch(c.p, c.s)} />
                <span className="truncate">{team.isUser ? `★ ${team.name}` : team.name}</span>
              </span>
              <span className="text-center">{row.played}</span>
              <span className="text-center">{row.won}</span>
              <span className="text-center">{row.drawn}</span>
              <span className="text-center">{row.lost}</span>
              <span className="hidden text-center sm:block">{row.gf}</span>
              <span className="hidden text-center sm:block">{row.ga}</span>
              <span className="text-center">
                {row.gf - row.ga > 0 ? '+' : ''}
                {row.gf - row.ga}
              </span>
              <span className="text-center font-black text-white">{row.points}</span>
              <span className="hidden justify-center gap-0.5 sm:flex">
                {row.form.map((f, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${f === 'W' ? 'bg-emerald-400' : f === 'D' ? 'bg-slate-400' : 'bg-rose-500'}`} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ───────────────────────────── title race chart ─────────────────────────────

/** Points over the season: you vs the three best rivals, with the 100-point line to chase. */
export const TitleRaceChart = memo(function TitleRaceChart({ sim, history, upto }: { sim: SeasonSim; history: Record<string, number[]>; upto: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const mw = upto;
  const rivals = Object.keys(history)
    .filter((id) => id !== USER_TEAM_ID)
    .sort((a, b) => (history[b][mw] ?? 0) - (history[a][mw] ?? 0))
    .slice(0, 3);
  const ids = [USER_TEAM_ID, ...rivals];
  const W = 360;
  const H = 170;
  const P = { l: 26, r: 46, t: 10, b: 18 };
  const maxY = Math.max(100, ...ids.map((id) => history[id]?.[mw] ?? 0)) + 4;
  const x = (i: number) => P.l + (i / TOTAL_MATCHWEEKS) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / maxY) * (H - P.t - P.b);
  // Rival lines use club colours; labels at the line end carry identity too.
  const lineColour = (id: string) => (id === USER_TEAM_ID ? '#34d399' : sim.teamById[id].primary === '#FFFFFF' || sim.teamById[id].primary.toLowerCase() === '#ffffff' ? sim.teamById[id].secondary : sim.teamById[id].primary);
  // Spread end labels so they don't collide.
  const ends = ids.map((id) => ({ id, v: history[id]?.[mw] ?? 0 })).sort((a, b) => b.v - a.v);
  const labelY: Record<string, number> = {};
  let lastY = -Infinity;
  ends.forEach((e) => {
    const yy = Math.max(y(e.v), lastY + 11);
    labelY[e.id] = yy;
    lastY = yy;
  });
  const hx = hover ?? mw;
  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-3">
      <h3 className="mb-1 font-display text-xl text-white">TITLE RACE</h3>
      {mw === 0 ? (
        <div className="py-8 text-center text-xs text-white/50">The race starts at kick-off.</div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-none select-none"
            onPointerMove={(e) => {
              const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              const i = Math.round(((px - P.l) / (W - P.l - P.r)) * TOTAL_MATCHWEEKS);
              setHover(Math.max(1, Math.min(mw, i)));
            }}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label="Points after each matchweek for you and the top three rivals"
          >
            {[0, 25, 50, 75].map((v) => (
              <g key={v}>
                <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.07)" />
                <text x={P.l - 4} y={y(v) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,.4)">
                  {v}
                </text>
              </g>
            ))}
            <line x1={P.l} x2={W - P.r} y1={y(100)} y2={y(100)} stroke="#facc15" strokeDasharray="3 3" strokeOpacity=".6" />
            <text x={P.l - 4} y={y(100) + 3} textAnchor="end" fontSize="8" fill="#facc15">100</text>
            <text x={x(19)} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.4)">MW19</text>
            <text x={x(38)} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.4)">38</text>
            {[...ids].reverse().map((id) => {
              const pts = (history[id] ?? []).slice(0, mw + 1);
              const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
              const user = id === USER_TEAM_ID;
              return <path key={id} d={d} fill="none" stroke={lineColour(id)} strokeWidth={user ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" opacity={user ? 1 : 0.85} />;
            })}
            {ids.map((id) => (
              <g key={`l${id}`}>
                <circle cx={x(mw)} cy={y(history[id]?.[mw] ?? 0)} r={id === USER_TEAM_ID ? 4 : 3} fill={lineColour(id)} stroke="#000" strokeWidth="1.5" />
                <text x={x(mw) + 7} y={labelY[id] + 3} fontSize="9" fontWeight="800" fill={id === USER_TEAM_ID ? '#fff' : 'rgba(255,255,255,.8)'}>
                  {id === USER_TEAM_ID ? 'YOU' : sim.teamById[id].short} {history[id]?.[mw] ?? 0}
                </text>
              </g>
            ))}
            {hover !== null && <line x1={x(hx)} x2={x(hx)} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,.35)" />}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-1 rounded-lg border border-white/15 bg-black/90 px-2 py-1 text-[10px] text-white" style={{ left: `${Math.min(70, (x(hx) / W) * 100)}%` }}>
              <div className="font-black">After MW{hx}</div>
              {ids
                .map((id) => ({ id, v: history[id]?.[hx] ?? 0 }))
                .sort((a, b) => b.v - a.v)
                .map(({ id, v }) => (
                  <div key={id} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-3 rounded-full" style={{ background: lineColour(id) }} />
                    <span className="flex-1">{id === USER_TEAM_ID ? 'You' : sim.teamById[id].name}</span>
                    <span className="font-black tabular-nums">{v}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
});

export { formatMinute };
