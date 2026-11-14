import { FastForward } from 'lucide-react';
import type { MatchResult, PlayerCard } from '../../types/game';
import { formatMinute, ordinal, type SeasonSim, USER_TEAM_ID } from '../../engine/seasonSimulator';
import type { LiveMatchweek } from '../../engine/liveMatch';
import { PlayerCardUI } from '../PlayerCardUI';

export interface FeedItem {
  key: number;
  minute: number;
  text: string;
  tone: 'goal' | 'concede' | 'chance' | 'info' | 'whistle' | 'news';
}

export interface Celebration {
  key: number;
  user: boolean;
  minute: number;
  scorer: string;
  assist: string | null;
  card?: PlayerCard;
  label: string; // GOAL! / LATE WINNER! / HAT-TRICK! ...
  teamName: string;
  colour: string;
}

interface Props {
  sim: SeasonSim;
  live: LiveMatchweek | null;
  minute: number;
  momentum: number; // -1 (away on top) .. 1 (home on top)
  feed: FeedItem[];
  celebration: Celebration | null;
  finished: boolean;
  onSkip: () => void;
  bigMatch: string | null;
}

const TONE: Record<FeedItem['tone'], string> = {
  goal: 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/50',
  concede: 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/40',
  chance: 'bg-amber-300/10 text-amber-100',
  info: 'bg-white/[0.04] text-white/75',
  whistle: 'bg-white/10 text-white font-black',
  news: 'bg-sky-400/10 text-sky-100',
};
const ICON: Record<FeedItem['tone'], string> = { goal: '⚽', concede: '⚽', chance: '😱', info: '•', whistle: '📣', news: '📡' };

export function LiveMatchHero({ sim, live, minute, momentum, feed, celebration, finished, onSkip, bigMatch }: Props) {
  const r: MatchResult | undefined = live?.results.find((x) => x.involvesUser);
  const next = !sim.done ? sim.userFixture(sim.matchweek) : null;

  // Before kick-off (or between weeks with nothing live): preview of the next game.
  if (!live || !r) {
    const opp = next ? sim.teamById[next.opponentId] : null;
    const oppRow = opp ? sim.table[opp.id] : null;
    const oppPos = opp ? sim.sortedTable().findIndex((x) => x.teamId === opp.id) + 1 : 0;
    return (
      <section data-shake-zone className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 via-black to-black p-4 sm:p-5">
        {sim.matchweek === 0 ? (
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">This season's league</div>
            <div className="mt-1 font-display text-4xl leading-none text-white sm:text-5xl">{sim.era.name.toUpperCase()}</div>
            <div className="text-xs font-bold text-yellow-300">{sim.era.years}</div>
            <div className="mx-auto mt-2 max-w-md text-sm text-white/70">{sim.era.tagline}</div>
          </div>
        ) : null}
        {opp && (
          <div className={`${sim.matchweek === 0 ? 'mt-4 border-t border-white/10 pt-4' : ''} text-center`}>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
              Next up · Matchweek {sim.matchweek + 1}
              {sim.matchweek + 1 === 19 && <span className="ml-1 text-yellow-300">· Derby Day</span>}
              {sim.matchweek + 1 === 38 && <span className="ml-1 text-yellow-300">· Final Day</span>}
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <TeamBadge name={sim.teamById[USER_TEAM_ID].name} colour="#10b981" second="#facc15" />
              <span className="font-display text-2xl text-white/40">{next!.home ? 'vs' : '@'}</span>
              {sim.matchweek + 1 === 19 ? (
                <TeamBadge name="Closest rival" colour="#334155" second="#facc15" />
              ) : (
                <TeamBadge name={opp.name} colour={opp.primary} second={opp.secondary} />
              )}
            </div>
            {oppRow && oppRow.played > 0 && sim.matchweek + 1 !== 19 && (
              <div className="mt-2 text-xs text-white/55">
                {opp.name}: {ordinal(oppPos)} · {oppRow.points} pts · form {oppRow.form.join('')}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  const home = sim.teamById[r.homeId];
  const away = sim.teamById[r.awayId];
  const userHome = r.homeId === USER_TEAM_ID;
  const end = live.userEnd;
  const clock = Math.min(minute, end);
  const isFT = finished || minute >= end;
  const isHT = !isFT && minute >= 45 && minute < 46.5;
  let hg = 0;
  let ag = 0;
  r.goals.forEach((g) => {
    if (g.minute > clock) return;
    if (g.teamId === r.homeId) hg++;
    else ag++;
  });
  const us = userHome ? hg : ag;
  const them = userHome ? ag : hg;
  const outcome = isFT ? (us > them ? 'W' : us < them ? 'L' : 'D') : null;
  const homeC = home.isUser ? '#10b981' : home.primary;
  const awayC = away.isUser ? '#10b981' : away.primary;
  const markers = [
    ...r.goals.filter((g) => g.minute <= clock).map((g) => ({ m: g.minute, goal: true, user: g.teamId === USER_TEAM_ID })),
    ...(r.chances ?? []).filter((c) => c.minute <= clock).map((c) => ({ m: c.minute, goal: false, user: c.teamId === USER_TEAM_ID })),
  ];

  return (
    <section
      data-shake-zone
      className={`relative overflow-hidden rounded-3xl border-2 p-3 transition-colors duration-500 sm:p-4 ${
        outcome === 'W' ? 'border-emerald-400 bg-emerald-950' : outcome === 'L' ? 'border-rose-500/80 bg-rose-950/60' : outcome === 'D' ? 'border-slate-400/60 bg-slate-900' : 'border-white/15 bg-gradient-to-b from-[#0b2416] to-black'
      }`}
    >
      {/* pitch stripes */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: 'repeating-linear-gradient(90deg, #fff 0 40px, transparent 40px 80px)' }} />
      <div className="relative flex h-7 items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-white/60">
          {!isFT && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
          {bigMatch ?? `Matchweek ${live.mw}`}
          {r.shout && <span className="rounded bg-yellow-300 px-1 text-black">{r.shout === 'attack' ? '🔥 All-out attack' : r.shout === 'bus' ? '🛡️ Park the bus' : '⚖️ Gameplan'}</span>}
        </span>
        {!isFT && (
          <button onClick={onSkip} className="flex items-center gap-1 rounded-md border border-white/20 bg-black/40 px-2 py-1 text-white/80 hover:bg-white/10">
            <FastForward className="h-3 w-3" /> Skip to FT
          </button>
        )}
      </div>

      {/* scoreboard */}
      <div className="relative mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TeamSide name={home.name} colour={homeC} second={home.isUser ? '#facc15' : home.secondary} user={home.isUser} align="right" />
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-1 rounded-2xl px-3 py-1 font-display text-5xl leading-none tabular-nums sm:text-7xl ${
              outcome === 'W' ? 'bg-emerald-400 text-black' : outcome === 'L' ? 'bg-rose-600 text-white' : outcome === 'D' ? 'bg-slate-500 text-white' : 'bg-black/70 text-white ring-1 ring-white/20'
            }`}
          >
            <span key={`h${hg}`} className="animate-pop">{hg}</span>
            <span className="text-white/40">-</span>
            <span key={`a${ag}`} className="animate-pop">{ag}</span>
          </div>
          <div className={`mt-1 rounded-md px-2 py-0.5 font-display text-lg leading-none tabular-nums ${isFT ? 'bg-white text-black' : isHT ? 'bg-yellow-300 text-black' : 'bg-red-600 text-white'}`}>
            {isFT ? 'FULL TIME' : isHT ? 'HALF-TIME' : formatMinute(Math.max(1, Math.floor(clock)))}
          </div>
        </div>
        <TeamSide name={away.name} colour={awayC} second={away.isUser ? '#facc15' : away.secondary} user={away.isUser} align="left" />
      </div>

      {/* scorers */}
      {/* fixed height so goals going in never push the page around while you scroll */}
      <div className="relative mt-2 grid h-[30px] grid-cols-2 gap-6 overflow-hidden text-[11px] leading-[15px] text-white/75">
        <div className="line-clamp-2 text-right">{scorers(r, r.homeId, clock)}</div>
        <div className="line-clamp-2">{scorers(r, r.awayId, clock)}</div>
      </div>

      {/* timeline + momentum */}
      <div className="relative mt-3">
        <div className="relative h-2 rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500/60 to-yellow-300/70" style={{ width: `${Math.min(100, (clock / end) * 100)}%` }} />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" title="Half-time" />
          {markers.map((k, i) => (
            <span
              key={i}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${k.goal ? 'h-3.5 w-3.5 border-2 border-black text-[8px]' : 'h-1.5 w-1.5'} ${k.user ? 'bg-emerald-300' : 'bg-rose-400'}`}
              style={{ left: `${Math.min(100, (k.m / end) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-white/50">
          <span className="w-16 truncate text-right">{home.short}</span>
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-label="Momentum">
            <div
              className="absolute inset-y-0 transition-all duration-300"
              style={{
                left: momentum >= 0 ? `${50 - momentum * 50}%` : '50%',
                right: momentum >= 0 ? '50%' : `${50 + momentum * 50}%`,
                background: momentum >= 0 ? homeC : awayC,
              }}
            />
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
          </div>
          <span className="w-16 truncate">{away.short}</span>
        </div>
        <div className="text-center text-[9px] font-black uppercase tracking-[0.25em] text-white/35">Momentum</div>
      </div>

      {/* commentary */}
      <div className="relative mt-2 flex h-[132px] flex-col gap-1 overflow-hidden">
        {feed.slice(0, 5).map((f, i) => (
          <div key={f.key} className={`flex items-start gap-2 rounded-lg px-2 py-1 text-xs ${TONE[f.tone]} ${i === 0 ? 'animate-pop' : ''}`} style={{ opacity: 1 - i * 0.14 }}>
            <span className="w-9 shrink-0 font-display text-sm leading-tight text-white/60 tabular-nums">{f.tone === 'whistle' && f.minute >= 90 ? 'FT' : formatMinute(Math.max(1, f.minute))}</span>
            <span className="shrink-0">{ICON[f.tone]}</span>
            <span className="min-w-0">{f.text}</span>
          </div>
        ))}
      </div>

      {/* the next fixture is always shown (fixed height) so the panel never changes size */}
      <div className="relative mt-2 h-[26px] truncate border-t border-white/10 pt-2 text-center text-[11px] text-white/60">
        {next && (<>
          Next: {sim.matchweek + 1 === 19 ? <b className="text-white/90">your closest title rival · DERBY DAY</b> : <><b className="text-white/90">{next.home ? 'vs' : '@'} {sim.teamById[next.opponentId].name}</b>{sim.matchweek + 1 === 38 && <span className="ml-1 font-black text-yellow-300">· FINAL DAY</span>}</>}
        </>)}
      </div>
      {celebration && <GoalCelebration c={celebration} />}
    </section>
  );
}

function scorers(r: MatchResult, teamId: string, clock: number) {
  const by = new Map<string, number[]>();
  r.goals.filter((g) => g.teamId === teamId && g.minute <= clock).forEach((g) => by.set(g.scorerName, [...(by.get(g.scorerName) ?? []), g.minute]));
  return [...by.entries()].map(([n, ms]) => `⚽ ${n} ${ms.map(formatMinute).join(', ')}`).join('  ');
}

function TeamSide({ name, colour, second, user, align }: { name: string; colour: string; second: string; user: boolean; align: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <span className="h-10 w-10 shrink-0 rounded-xl border-2 border-black/50 shadow-lg sm:h-14 sm:w-14" style={{ background: `linear-gradient(135deg, ${colour} 55%, ${second} 55%)` }} />
      <span className={`min-w-0 break-words font-display text-xl leading-none sm:text-3xl ${user ? 'text-emerald-300' : 'text-white'}`}>{name}</span>
    </div>
  );
}

function TeamBadge({ name, colour, second }: { name: string; colour: string; second: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-lg border-2 border-black/50" style={{ background: `linear-gradient(135deg, ${colour} 55%, ${second} 55%)` }} />
      <span className="font-display text-2xl leading-none text-white">{name}</span>
    </span>
  );
}

function GoalCelebration({ c }: { c: Celebration }) {
  if (!c.user) {
    return (
      <div key={c.key} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-rose-950/70">
        <div className="animate-pop text-center">
          <div className="font-display text-5xl tracking-wider text-rose-300 sm:text-6xl">{c.label}</div>
          <div className="mt-1 text-sm font-bold text-white/85">
            {c.scorer} {formatMinute(c.minute)} · {c.teamName}
          </div>
        </div>
      </div>
    );
  }
  const huge = c.label !== 'GOAL!';
  return (
    <div key={c.key} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 45%, ${c.colour}cc, #000000e6 70%)` }}>
      <div className="absolute inset-0 animate-flash bg-white" style={{ ['--flash-max' as string]: 0.6 }} />
      <div className="relative flex items-center gap-4 px-4">
        {c.card && (
          <div className="hidden animate-pop sm:block" style={{ animationDelay: '.15s' }}>
            <PlayerCardUI card={c.card} size="sm" tilt={false} />
          </div>
        )}
        <div className="text-center sm:text-left">
          <div className={`animate-stamp font-display leading-none tracking-wider text-yellow-300 drop-shadow-[0_4px_0_rgba(0,0,0,.6)] ${huge ? 'text-6xl sm:text-8xl' : 'text-7xl sm:text-8xl'}`} style={{ transform: 'rotate(-6deg)' }}>
            {c.label}
          </div>
          <div className="mt-2 font-display text-3xl leading-none text-white sm:text-4xl">{c.scorer.toUpperCase()}</div>
          <div className="mt-1 text-sm font-bold text-white/80">
            {formatMinute(c.minute)}
            {c.assist ? ` · assist ${c.assist}` : ''}
          </div>
          {c.card && (
            <div className="mt-2 flex justify-center sm:hidden">
              <PlayerCardUI card={c.card} size="xs" tilt={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
