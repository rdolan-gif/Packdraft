import type { Milestone } from '../../engine/liveMatch';
import { userStreaks } from '../../engine/liveMatch';
import { ordinal, type SeasonSim, TOTAL_MATCHWEEKS, USER_TEAM_ID } from '../../engine/seasonSimulator';
import { PlayerCardUI } from '../PlayerCardUI';

/** Milestone pop-up: huge ones take over the screen, smaller ones slide in as a banner. */
export function MilestonePop({ m }: { m: Milestone }) {
  if (m.size === 3) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[86] flex items-center justify-center bg-black/60 p-4">
        <div className="relative animate-pop overflow-hidden rounded-3xl border-4 border-yellow-300 bg-gradient-to-b from-amber-500/30 via-black to-black px-8 py-6 text-center shadow-[0_0_90px_rgba(250,204,21,.55)]">
          <div className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="relative text-6xl">{m.icon}</div>
          <div className="relative mt-1 animate-stamp font-display text-5xl leading-none tracking-wider text-yellow-300 sm:text-7xl" style={{ transform: 'rotate(-4deg)' }}>
            {m.title}
          </div>
          <div className="relative mt-3 text-sm font-bold text-white/90 sm:text-base">{m.sub}</div>
        </div>
      </div>
    );
  }
  const sad = m.tone === 'sad';
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-[86] w-[min(92vw,460px)] -translate-x-1/2 animate-pop">
      <div
        className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 shadow-2xl ${
          sad ? 'border-slate-400/60 bg-slate-900/95' : m.size === 2 ? 'border-yellow-300 bg-gradient-to-r from-amber-600/90 to-yellow-500/90' : 'border-emerald-300/70 bg-emerald-950/95'
        }`}
      >
        <span className="text-3xl">{m.icon}</span>
        <div className="min-w-0">
          <div className={`font-display text-2xl leading-none tracking-wide ${m.size === 2 && !sad ? 'text-black' : 'text-white'}`}>{m.title}</div>
          <div className={`text-xs font-bold ${m.size === 2 && !sad ? 'text-black/75' : 'text-white/75'}`}>{m.sub}</div>
        </div>
      </div>
    </div>
  );
}

/** The chase: perfect record, unbeaten run, win streak and points pace, always on screen. */
export function ChaseBadges({ sim, upto }: { sim: SeasonSim; upto: number }) {
  const s = userStreaks(sim, upto);
  if (!s.played) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {s.perfect ? (
        <span className="animate-aura rounded-lg bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 px-2 py-0.5 font-display text-base leading-tight text-black" title="Every game won. Keep it going for 38-0.">
          💎 PERFECT {s.won}-0
        </span>
      ) : s.invincible ? (
        <span className="rounded-lg bg-yellow-300 px-2 py-0.5 font-display text-base leading-tight text-black" title="No defeats this season">
          🛡️ UNBEATEN · {s.played}
        </span>
      ) : null}
      {s.win >= 3 && !s.perfect && <span className="rounded-lg bg-orange-500 px-2 py-0.5 font-display text-base leading-tight text-black">🔥 {s.win} WINS</span>}
      <span className={`rounded-lg px-2 py-0.5 font-display text-base leading-tight ${s.pace >= 100 ? 'bg-fuchsia-500 text-white' : s.pace >= 90 ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/80'}`} title="Points if you keep this up for 38 games">
        PACE {s.pace} PTS
      </span>
    </div>
  );
}

/** Half-way awards ceremony before the January window opens. */
export function MidSeasonAwards({ sim, onContinue }: { sim: SeasonSim; onContinue: () => void }) {
  const user = sim.teamById[USER_TEAM_ID];
  const userStats = user.players.map((p) => ({ p, s: sim.stats[p.id] })).filter((x) => x.s && x.s.apps > 0);
  const best = [...userStats].sort((a, b) => b.s.ratingSum / b.s.apps - a.s.ratingSum / a.s.apps)[0];
  const scorer = [...userStats].sort((a, b) => b.s.goals - a.s.goals || b.s.assists - a.s.assists)[0];
  const boot = sim.leaders('goals', 1)[0];
  const st = userStreaks(sim);
  const row = sim.table[USER_TEAM_ID];
  const pos = sim.userPosition();
  const awards = [
    best && {
      title: 'Player of the Half-Season',
      card: best.p.card,
      line: `${best.p.name} · avg rating ${(best.s.ratingSum / best.s.apps).toFixed(1)} · ${best.s.goals}G ${best.s.assists}A`,
    },
    scorer && { title: 'Your Top Scorer', card: scorer.p.card, line: `${scorer.p.name} · ${scorer.s.goals} goals, ${scorer.s.assists} assists` },
    {
      title: 'League Golden Boot Race',
      card: undefined,
      line: boot ? `${boot.name} (${sim.teamById[boot.teamId].short}) leads with ${boot.goals}` : 'Nobody has scored yet',
    },
  ].filter(Boolean) as { title: string; card?: import('../../types/game').PlayerCard; line: string }[];

  return (
    <div className="fixed inset-0 z-[91] overflow-y-auto overscroll-contain bg-black/90" role="dialog" aria-label="Mid-season awards">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-3xl animate-pop overflow-hidden rounded-3xl border-2 border-yellow-300/70 bg-gradient-to-b from-zinc-900 to-black">
          <div className="bg-yellow-300 px-5 py-2 text-center text-xs font-black uppercase tracking-[0.35em] text-black">Mid-Season Awards</div>
          <div className="p-4 text-center sm:p-6">
            <div className="font-display text-4xl leading-none text-white sm:text-5xl">HALFWAY THERE</div>
            <div className="mt-1 text-sm text-white/70">
              {ordinal(pos)} on {row.points} pts ({row.won}W {row.drawn}D {row.lost}L) · on pace for <b className="text-yellow-300">{st.pace} pts</b> over {TOTAL_MATCHWEEKS} games
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {awards.map((a, i) => (
                <div key={a.title} className="flex animate-pop flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3" style={{ animationDelay: `${0.35 + i * 0.45}s` }}>
                  <div className="text-[10px] font-black uppercase tracking-widest text-yellow-300">🏅 {a.title}</div>
                  {a.card ? <PlayerCardUI card={a.card} size="sm" tilt={false} /> : <div className="flex h-[150px] items-center justify-center text-6xl">👟</div>}
                  <div className="text-xs font-bold text-white/85">{a.line}</div>
                </div>
              ))}
            </div>
            <button
              onClick={onContinue}
              className="mt-5 animate-pop rounded-2xl bg-gradient-to-r from-sky-300 via-cyan-300 to-sky-300 px-6 py-3 font-display text-2xl tracking-wider text-black transition hover:scale-105"
              style={{ animationDelay: '1.7s' }}
            >
              OPEN THE JANUARY WINDOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
