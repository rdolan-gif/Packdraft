import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Pause, Play, Radio, Shield, Swords, Scale, Target, Footprints, Hand, Flame } from 'lucide-react';
import type { FormationId, Lineup, ManagerId, MatchResult, PlayerCard, PlayerSeasonStats, TacticalShout } from '../types/game';
import { formatMinute, INFORM_BOOST, INFORM_SLOTS, INFORM_WEEKS, ordinal, SeasonSim, TOTAL_MATCHWEEKS, TRANSFER_WINDOW_AFTER, USER_TEAM_ID, type DecisionContext } from '../engine/seasonSimulator';
import { TransferWindow } from './TransferWindow';
import { PlayerCardUI } from './PlayerCardUI';
import { recordTotw } from '../engine/stickerBook';
import { sfx } from '../engine/soundEffects';
import { goldConfetti, shakeScreen } from '../engine/fx';

type Speed = 1 | 2 | 4 | 'instant';
const SPEED_MS: Record<Exclude<Speed, 'instant'>, number> = { 1: 2000, 2: 1000, 4: 500 };
const ROW_H = 30;

interface Props {
  sim: SeasonSim;
  onFinish: () => void;
  formationId: FormationId;
  lineup: Lineup;
  managerId: ManagerId;
  /** January signing: App updates the lineup and the sim. */
  onTransfer: (card: PlayerCard, slotId: string) => void;
}

export function SeasonBroadcast({ sim, onFinish, formationId, lineup, managerId, onTransfer }: Props) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [informReveal, setInformReveal] = useState<{ key: number; cards: { card: PlayerCard; boost: number }[] } | null>(null);
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [decision, setDecision] = useState<DecisionContext | null>(null);
  const [tab, setTab] = useState<'goals' | 'assists' | 'cleanSheets'>('goals');
  const [flashResult, setFlashResult] = useState<'W' | 'D' | 'L' | null>(null);
  const [instantRun, setInstantRun] = useState(false);
  const timer = useRef<number | null>(null);

  const done = sim.done;
  const table = sim.sortedTable();
  const latest: MatchResult[] = sim.results[sim.matchweek - 1] ?? [];
  const userRow = sim.table[USER_TEAM_ID];
  const userPos = sim.userPosition();
  const nextFixture = !done ? sim.userFixture(sim.matchweek) : null;

  const userOutcome = (r: MatchResult | undefined) => {
    if (!r) return null;
    const home = r.homeId === USER_TEAM_ID;
    const us = home ? r.homeGoals : r.awayGoals;
    const them = home ? r.awayGoals : r.homeGoals;
    return us > them ? 'W' : us < them ? 'L' : 'D';
  };

  /** Plays one matchweek; returns false if a decision pause is required. */
  const step = useCallback(
    (quiet: boolean, shout?: TacticalShout): boolean => {
      if (sim.done) return false;
      if (!shout && sim.needsTransferWindow()) {
        setTransferOpen(true);
        setPlaying(false);
        setInstantRun(false);
        sfx.tension();
        bump();
        return false;
      }
      if (!shout) {
        const d = sim.checkDecision();
        if (d) {
          setDecision(d);
          setPlaying(false);
          setInstantRun(false);
          sfx.tension();
          shakeScreen('micro');
          bump();
          return false;
        }
      }
      const results = sim.playMatchweek(shout);
      const out = userOutcome(results[0]);
      // Team of the Week: honours go in the sticker book; reveal your in-form players.
      if (sim.newTotwIds.length) {
        recordTotw(sim.newTotwIds);
        if (!quiet) {
          const userPlayers = sim.teamById[USER_TEAM_ID].players;
          const cards = sim.newTotwIds
            .map((id) => ({ card: userPlayers.find((p) => p.id === id)?.card, boost: sim.informs[id]?.boost ?? 0 }))
            .filter((x): x is { card: PlayerCard; boost: number } => !!x.card);
          if (cards.length) {
            setInformReveal({ key: Date.now(), cards });
            sfx.stinger('ELITE');
          }
        }
      }
      if (!quiet) {
        setFlashResult(out);
        if (out === 'W') sfx.goal(sim.matchweek === 19 || sim.matchweek === 38);
        else if (out === 'L') sfx.concede();
        else sfx.whistle();
      }
      if (sim.done) {
        setPlaying(false);
        setInstantRun(false);
        sfx.finalWhistle();
        const row = sim.table[USER_TEAM_ID];
        if (sim.userPosition() === 1) {
          goldConfetti(row.lost === 0 ? 1.6 : 1);
          sfx.trophy();
        }
      }
      return true;
    },
    [sim],
  );

  // Timed playback
  useEffect(() => {
    if (!playing || decision || done || speed === 'instant') return;
    timer.current = window.setTimeout(() => {
      step(false);
      bump();
    }, SPEED_MS[speed]);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Re-arm only when playback state changes. With no deps, every re-render (e.g. the
    // result flash clearing) restarted the countdown and 1x/2x ran ~50-90% slow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, decision, done, speed, sim.matchweek]);

  // Instant sim: run until a decision or the end (batched to keep the UI responsive)
  useEffect(() => {
    if (!instantRun || decision) return;
    const id = window.setTimeout(() => {
      let n = 0;
      while (n < 4 && step(true)) n++;
      bump();
      if (sim.done) setInstantRun(false);
    }, 40);
    return () => clearTimeout(id);
  });

  useEffect(() => {
    if (!informReveal) return;
    const id = window.setTimeout(() => setInformReveal(null), 2600);
    return () => clearTimeout(id);
  }, [informReveal]);

  useEffect(() => {
    if (!flashResult) return;
    const id = window.setTimeout(() => setFlashResult(null), 900);
    return () => clearTimeout(id);
  }, [flashResult, sim.matchweek]);

  // After the window, carry on at the chosen speed.
  const closeWindow = () => {
    setTransferOpen(false);
    bump();
    if (speed === 'instant') setInstantRun(true);
    else setPlaying(true);
  };

  const choose = (shout: TacticalShout) => {
    sfx.select();
    setDecision(null);
    step(false, shout);
    bump();
    // Carry on at the chosen speed. (Instant Sim used to stop here and look frozen.)
    if (sim.done) return;
    if (speed === 'instant') setInstantRun(true);
    else setPlaying(true);
  };

  const leaders = useMemo(() => sim.leaders(tab, 10), [sim, tab, sim.matchweek]);

  const tickerText = useMemo(() => {
    const items = latest.filter((r) => r.headline).map((r) => `MW${r.matchweek}: ${r.headline}`);
    return items.length ? items.join('   •   ') : 'Welcome to the PackDraft 38 Live Broadcast. 20 clubs, 38 matchweeks, one shot at immortality.';
  }, [latest]);

  const userMatch = latest[0]?.involvesUser ? latest[0] : undefined;
  const outcome = userOutcome(userMatch);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-4 sm:px-4">
      {/* Broadcast header */}
      <div data-shake-zone className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950 via-black to-emerald-950">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </span>
            <span className="font-display text-2xl leading-none text-white sm:text-3xl">
              MATCHWEEK {Math.min(sim.matchweek + (done ? 0 : 1), TOTAL_MATCHWEEKS)} <span className="text-white/40">/ 38</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-lg bg-white/10 px-2 py-1 font-black text-yellow-300">{ordinal(userPos)}</span>
            <span className="font-bold text-white/80">
              {userRow.won}W-{userRow.drawn}D-{userRow.lost}L · <span className="text-yellow-300">{userRow.points} pts</span>
            </span>
            {userRow.lost === 0 && userRow.played > 0 && <span className="rounded bg-yellow-300 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">Unbeaten</span>}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {!done && (
              <button
                onClick={() => {
                  sfx.click();
                  if (playing || instantRun) {
                    setPlaying(false);
                    setInstantRun(false);
                  } else if (speed === 'instant') setInstantRun(true);
                  else setPlaying(true);
                }}
                disabled={!!decision || transferOpen}
                className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-black text-black transition hover:bg-emerald-400 disabled:opacity-40"
              >
                {playing || instantRun ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing || instantRun ? 'Pause' : sim.matchweek === 0 ? 'Kick Off' : 'Play'}
              </button>
            )}
            {([1, 2, 4, 'instant'] as Speed[]).map((s) => (
              <button
                key={String(s)}
                onClick={() => {
                  sfx.click();
                  setSpeed(s);
                  if (s === 'instant' && (playing || instantRun)) {
                    setPlaying(false);
                    setInstantRun(true);
                  } else if (s !== 'instant' && instantRun) {
                    setInstantRun(false);
                    setPlaying(true);
                  }
                }}
                className={`rounded-lg border px-2 py-1.5 text-xs font-black transition ${speed === s ? 'border-yellow-300 bg-yellow-300/20 text-yellow-200' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}
              >
                {s === 'instant' ? 'Instant Sim' : `${s}x`}
              </button>
            ))}
            {!done && (
              <button
                onClick={() => {
                  sfx.click();
                  setPlaying(false);
                  setInstantRun(true);
                }}
                disabled={!!decision || transferOpen}
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40"
                title="Simulate to the next big match (MW19 / MW38) or the end"
              >
                <FastForward className="h-3.5 w-3.5" /> {sim.matchweek < 19 ? 'Sim to Derby Day' : !sim.transferDone && sim.matchweek <= TRANSFER_WINDOW_AFTER ? 'Sim to January Window' : sim.matchweek < 38 ? 'Sim to Final Day' : 'Sim to End'}
              </button>
            )}
          </div>
        </div>
        {/* Marquee ticker */}
        <div className="relative overflow-hidden border-t border-white/10 bg-yellow-300 py-1 text-black">
          <div className="flex w-max animate-ticker whitespace-nowrap text-xs font-black uppercase tracking-wider">
            <span className="px-6">{tickerText}</span>
            <span className="px-6">{tickerText}</span>
          </div>
        </div>
        {/* progress */}
        <div className="h-1 w-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-all duration-500" style={{ width: `${(sim.matchweek / 38) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
        {/* League table */}
        <section className="rounded-2xl border border-white/10 bg-black/40 p-2 sm:p-3">
          <h3 className="mb-2 flex items-center justify-between px-1 font-display text-xl text-white">
            PREMIER LEAGUE TABLE
            <span className="flex gap-2 text-[9px] font-black uppercase tracking-wider">
              <span className="text-yellow-300">■ Title</span>
              <span className="text-sky-400">■ UCL</span>
              <span className="text-rose-500">■ Drop</span>
            </span>
          </h3>
          <div className="grid grid-cols-[26px_1fr_24px_24px_24px_24px_34px_32px] gap-1 px-2 pb-1 text-[10px] font-black uppercase text-white/40 sm:grid-cols-[26px_1fr_24px_24px_24px_24px_28px_28px_34px_32px_70px]">
            <span>#</span>
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
          <div className="relative" style={{ height: ROW_H * 20 }}>
            {table.map((row, idx) => {
              const team = sim.teamById[row.teamId];
              const pos = idx + 1;
              const zone = pos === 1 ? 'border-l-yellow-300' : pos <= 4 ? 'border-l-sky-400' : pos >= 18 ? 'border-l-rose-500' : 'border-l-transparent';
              const isUser = team.isUser;
              return (
                <div
                  key={row.teamId}
                  className={`row-move absolute inset-x-0 grid grid-cols-[26px_1fr_24px_24px_24px_24px_34px_32px] items-center gap-1 rounded-md border-l-4 px-2 text-xs sm:grid-cols-[26px_1fr_24px_24px_24px_24px_28px_28px_34px_32px_70px] ${zone} ${
                    isUser ? 'bg-gradient-to-r from-emerald-500/35 via-emerald-500/20 to-yellow-400/20 font-black text-white ring-1 ring-yellow-300/60' : idx % 2 ? 'bg-white/[0.03] text-white/85' : 'text-white/85'
                  }`}
                  style={{ transform: `translateY(${idx * ROW_H}px)`, height: ROW_H - 2 }}
                >
                  <span className={`font-black ${pos === 1 ? 'text-yellow-300' : 'text-white/60'}`}>{pos}</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-3 w-3 shrink-0 rounded-sm border border-black/40" style={{ background: `linear-gradient(135deg, ${team.primary} 50%, ${team.secondary} 50%)` }} />
                    <span className="truncate">{isUser ? `★ ${team.name}` : team.name}</span>
                  </span>
                  <span className="text-center">{row.played}</span>
                  <span className="text-center">{row.won}</span>
                  <span className="text-center">{row.drawn}</span>
                  <span className="text-center">{row.lost}</span>
                  <span className="hidden text-center sm:block">{row.gf}</span>
                  <span className="hidden text-center sm:block">{row.ga}</span>
                  <span className="text-center">{row.gf - row.ga > 0 ? '+' : ''}{row.gf - row.ga}</span>
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

        <div className="flex flex-col gap-3">
          {/* Your match */}
          <section
            className={`relative overflow-hidden rounded-2xl border p-3 transition-colors ${
              flashResult === 'W' ? 'border-emerald-400 bg-emerald-500/25' : flashResult === 'L' ? 'border-rose-500 bg-rose-500/20' : flashResult === 'D' ? 'border-slate-300 bg-slate-500/20' : 'border-white/10 bg-black/40'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
              {userMatch ? `Your result · MW${userMatch.matchweek}` : 'Season preview'}
              {userMatch?.shout && <span className="ml-2 rounded bg-yellow-300 px-1 text-black">{userMatch.shout === 'attack' ? '🔥 All-Out Attack' : userMatch.shout === 'bus' ? '🛡️ Park the Bus' : '⚖️ Gameplan'}</span>}
            </div>
            {userMatch ? (
              <UserMatchCard r={userMatch} sim={sim} outcome={outcome} />
            ) : (
              <div className="py-3 text-sm text-white/70">
                Your XI kicks off against <b className="text-white">{nextFixture ? sim.teamById[nextFixture.opponentId].name : ''}</b>
                {nextFixture?.home ? ' at home' : ' away'}. Press <b className="text-emerald-300">Kick Off</b> to start the broadcast.
              </div>
            )}
            {!done && nextFixture && userMatch && (
              <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-white/60">
                {sim.matchweek + 1 === 19 ? (
                  // The derby opponent is picked at kick-off (closest rival), so don't name a team yet.
                  <>Next: <b className="text-white/90">your closest title rival</b><span className="ml-1 font-black text-yellow-300">· DERBY DAY</span></>
                ) : (
                  <>Next: {nextFixture.home ? 'vs' : '@'} <b className="text-white/90">{sim.teamById[nextFixture.opponentId].name}</b></>
                )}
                {sim.matchweek + 1 === 38 && <span className="ml-1 font-black text-yellow-300">· FINAL DAY</span>}
              </div>
            )}
          </section>

          {/* Matchday ticker */}
          <section className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <h3 className="mb-2 font-display text-xl text-white">MATCHDAY RESULTS</h3>
            <div className="scrollbar-thin flex max-h-[260px] flex-col gap-1 overflow-y-auto pr-1">
              {latest.length === 0 && <div className="text-xs text-white/50">No results yet.</div>}
              {latest.map((r) => (
                <FixtureRow key={`${r.homeId}-${r.awayId}`} r={r} sim={sim} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Team of the Week + your in-form players */}
      <TotwPanel sim={sim} />

      {/* Leaderboards */}
      <section className="rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl text-white">LEAGUE LEADERS</h3>
          <div className="ml-auto flex gap-1">
            {(
              [
                ['goals', 'Golden Boot', Target],
                ['assists', 'Playmaker', Footprints],
                ['cleanSheets', 'Golden Glove', Hand],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => {
                  sfx.click();
                  setTab(k);
                }}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-black ${tab === k ? 'border-yellow-300 bg-yellow-300/20 text-yellow-200' : 'border-white/10 bg-white/5 text-white/60'}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
        <Leaders rows={leaders} kind={tab} sim={sim} />
      </section>

      {done && (
        <div className="sticky bottom-3 z-40 mx-auto flex animate-pop flex-col items-center gap-2 rounded-2xl border border-yellow-300/60 bg-black/85 px-6 py-4 text-center shadow-2xl">
          <div className="font-display text-3xl text-yellow-300">FULL TIME · SEASON OVER</div>
          <div className="text-sm text-white/80">
            Finished <b>{ordinal(userPos)}</b> with <b>{userRow.points} pts</b> ({userRow.won}-{userRow.drawn}-{userRow.lost})
          </div>
          <button
            onClick={() => {
              sfx.select();
              onFinish();
            }}
            className="rounded-xl bg-gradient-to-r from-yellow-300 to-amber-500 px-6 py-2.5 font-display text-2xl tracking-wider text-black transition hover:scale-105"
          >
            REVEAL SEASON REVIEW CARD
          </button>
        </div>
      )}

      {informReveal && (
        <div key={informReveal.key} className="pointer-events-none fixed left-1/2 top-20 z-[85] -translate-x-1/2 animate-pop">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-cyan-300/70 bg-black/90 px-5 py-3 shadow-[0_0_40px_rgba(34,211,238,.45)]">
            <div className="font-display text-2xl tracking-wider text-cyan-200">TEAM OF THE WEEK!</div>
            <div className="flex gap-2">
              {informReveal.cards.map(({ card, boost }) => (
                <InformCard key={card.id} card={card} boost={boost} />
              ))}
            </div>
            <div className="text-[11px] font-bold text-white/70">In form: +{informReveal.cards[0].boost} OVR for {INFORM_WEEKS} matchweeks</div>
          </div>
        </div>
      )}

      {decision && <DecisionOverlay d={decision} sim={sim} onChoose={choose} />}
      {transferOpen && (
        <TransferWindow
          formationId={formationId}
          lineup={lineup}
          managerId={managerId}
          position={sim.userPosition()}
          points={sim.table[USER_TEAM_ID].points}
          onSign={(card, slotId) => {
            onTransfer(card, slotId);
            closeWindow();
          }}
          onSkip={() => {
            sim.skipTransferWindow();
            closeWindow();
          }}
        />
      )}
    </div>
  );
}

function scorerLine(r: MatchResult, teamId: string) {
  const by = new Map<string, number[]>();
  r.goals.filter((g) => g.teamId === teamId).forEach((g) => by.set(g.scorerName, [...(by.get(g.scorerName) ?? []), g.minute]));
  return [...by.entries()].map(([n, ms]) => `${n} ${ms.map(formatMinute).join(', ')}`).join(', ');
}

function UserMatchCard({ r, sim, outcome }: { r: MatchResult; sim: SeasonSim; outcome: 'W' | 'D' | 'L' | null }) {
  const h = sim.teamById[r.homeId];
  const a = sim.teamById[r.awayId];
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between gap-2">
        <div className={`flex-1 truncate text-right font-display text-xl ${h.isUser ? 'text-emerald-300' : 'text-white'}`}>{h.name}</div>
        <div className={`rounded-lg px-3 py-1 font-display text-4xl leading-none ${outcome === 'W' ? 'bg-emerald-500 text-black' : outcome === 'L' ? 'bg-rose-600 text-white' : 'bg-slate-500 text-white'}`}>
          {r.homeGoals}-{r.awayGoals}
        </div>
        <div className={`flex-1 truncate font-display text-xl ${a.isUser ? 'text-emerald-300' : 'text-white'}`}>{a.name}</div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-3 text-[11px] text-white/70">
        <div className="text-right">{scorerLine(r, r.homeId)}</div>
        <div>{scorerLine(r, r.awayId)}</div>
      </div>
      {r.headline && <div className="mt-2 text-center text-sm font-black uppercase tracking-wide text-yellow-300">“{r.headline}”</div>}
    </div>
  );
}

function FixtureRow({ r, sim }: { r: MatchResult; sim: SeasonSim }) {
  const h = sim.teamById[r.homeId];
  const a = sim.teamById[r.awayId];
  return (
    <div className={`rounded-lg px-2 py-1.5 text-xs ${r.involvesUser ? 'bg-emerald-500/15 ring-1 ring-emerald-400/50' : 'bg-white/[0.03]'}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className={`truncate text-right ${h.isUser ? 'font-black text-emerald-300' : 'text-white/85'}`}>{h.name}</span>
        <span className="rounded bg-black/60 px-2 font-display text-base leading-tight text-white">
          {r.homeGoals}-{r.awayGoals}
        </span>
        <span className={`truncate ${a.isUser ? 'font-black text-emerald-300' : 'text-white/85'}`}>{a.name}</span>
      </div>
      {(r.goals.length > 0 || r.headline) && (
        <div className="mt-0.5 grid grid-cols-[1fr_auto_1fr] gap-2 text-[10px] text-white/45">
          <span className="truncate text-right">{scorerLine(r, r.homeId)}</span>
          <span className="w-10" />
          <span className="truncate">{scorerLine(r, r.awayId)}</span>
        </div>
      )}
      {r.headline && !r.involvesUser && <div className="text-center text-[10px] font-bold italic text-yellow-200/80">{r.headline}</div>}
    </div>
  );
}

function Leaders({ rows, kind, sim }: { rows: PlayerSeasonStats[]; kind: 'goals' | 'assists' | 'cleanSheets'; sim: SeasonSim }) {
  if (!rows.length) return <div className="py-3 text-center text-xs text-white/50">The leaderboard fills up once the ball starts rolling.</div>;
  const max = rows[0][kind] || 1;
  return (
    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
      {rows.map((p, i) => {
        const team = sim.teamById[p.teamId];
        return (
          <div key={p.id} className={`relative flex items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-xs ${p.isUser ? 'bg-emerald-500/15 ring-1 ring-yellow-300/50' : 'bg-white/[0.03]'}`}>
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-300/15 to-transparent transition-all duration-500" style={{ width: `${(p[kind] / max) * 100}%` }} />
            <span className={`relative w-5 font-black ${i === 0 ? 'text-yellow-300' : 'text-white/50'}`}>{i + 1}</span>
            <span className="relative h-3 w-3 shrink-0 rounded-sm" style={{ background: `linear-gradient(135deg, ${team.primary} 50%, ${team.secondary} 50%)` }} />
            <span className={`relative flex-1 truncate ${p.isUser ? 'font-black text-white' : 'text-white/85'}`}>
              {p.isUser && '★ '}
              {p.name} <span className="text-white/40">· {team.short}</span>
            </span>
            <span className="relative font-display text-lg leading-none text-white">{p[kind]}</span>
          </div>
        );
      })}
    </div>
  );
}

function DecisionOverlay({ d, sim, onChoose }: { d: DecisionContext; sim: SeasonSim; onChoose: (s: TacticalShout) => void }) {
  const opp = sim.teamById[d.opponentId];
  const options: { id: TacticalShout; icon: typeof Flame; title: string; emoji: string; desc: string; cls: string }[] = [
    { id: 'attack', icon: Swords, emoji: '🔥', title: 'All-Out Attack', desc: '+35% xG for you · +30% xG against', cls: 'from-rose-600 to-orange-500 border-rose-300' },
    { id: 'balanced', icon: Scale, emoji: '⚖️', title: 'Stick to Gameplan', desc: 'Standard balanced simulation', cls: 'from-slate-600 to-slate-800 border-slate-300' },
    { id: 'bus', icon: Shield, emoji: '🛡️', title: 'Park the Bus', desc: '−35% xG against · −25% xG for you', cls: 'from-sky-700 to-indigo-900 border-sky-300' },
  ];
  return (
    // Scrollable so every choice stays reachable on short screens or with enlarged text.
    <div className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-black/90">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-3xl animate-pop overflow-hidden rounded-3xl border-2 border-yellow-300/70 bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_80px_rgba(250,204,21,.25)]">
        <div className="bg-yellow-300 px-5 py-2 text-center text-xs font-black uppercase tracking-[0.35em] text-black">Touchline Tactical Decision</div>
        <div className="p-5 text-center sm:p-7">
          <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Matchweek {d.matchweek} · {d.title}</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <div className="min-w-0 break-words font-display text-2xl text-emerald-300 sm:text-4xl">{sim.teamById[USER_TEAM_ID].name}</div>
            <div className="font-display text-xl text-white/50 sm:text-2xl">{d.home ? 'vs' : '@'}</div>
            <div className="flex min-w-0 items-center gap-2 break-words font-display text-2xl text-white sm:text-4xl">
              <span className="h-5 w-5 rounded" style={{ background: `linear-gradient(135deg, ${opp.primary} 50%, ${opp.secondary} 50%)` }} />
              {opp.name}
            </div>
          </div>
          <div className="mx-auto mt-4 flex max-w-xl flex-col gap-1">
            {d.stakes.map((s, i) => (
              <div key={i} className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/85">
                {s}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => onChoose(o.id)}
                onMouseEnter={() => sfx.hover()}
                className={`group flex items-center gap-3 rounded-2xl border-2 bg-gradient-to-br ${o.cls} p-3 text-left transition hover:-translate-y-1 hover:shadow-xl active:scale-95 sm:block sm:p-4`}
              >
                <div className="text-3xl">{o.emoji}</div>
                <div>
                  <div className="font-display text-2xl leading-none text-white sm:mt-1">{o.title}</div>
                  <div className="mt-1 text-xs font-semibold text-white/80">{o.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

/** An in-form version of a card: boosted OVR inside a neon TOTW frame. */
function InformCard({ card, boost, size = 'xs' }: { card: PlayerCard; boost: number; size?: 'xs' | 'sm' }) {
  return (
    <div className="relative rounded-[16px] p-[3px] shadow-[0_0_18px_rgba(34,211,238,.6)]" style={{ background: 'conic-gradient(from 0deg, #22d3ee, #a855f7, #f43f5e, #facc15, #22d3ee)' }}>
      <PlayerCardUI card={{ ...card, ovr: Math.min(99, card.ovr + boost) }} size={size} tilt={false} />
      <span className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300">
        TOTW +{boost}
      </span>
    </div>
  );
}

function TotwPanel({ sim }: { sim: SeasonSim }) {
  const totw = sim.latestTotw;
  const informs = sim.activeInforms();
  const userCards = new Map(sim.teamById[USER_TEAM_ID].players.map((p) => [p.id, p.card]));
  if (!totw && !informs.length) return null;
  return (
    <section className="grid grid-cols-1 gap-3 rounded-2xl border border-cyan-300/25 bg-black/40 p-3 lg:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0">
        <h3 className="mb-2 font-display text-xl text-white">
          TEAM OF THE WEEK <span className="text-cyan-300">· MW{totw?.mw}</span>
        </h3>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {totw?.players.map((p) => {
            const team = sim.teamById[p.teamId];
            return (
              <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${p.isUser ? 'bg-cyan-400/15 ring-1 ring-cyan-300/60' : 'bg-white/[0.03]'}`}>
                <span className="w-8 font-black text-white/50">{p.pos}</span>
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: `linear-gradient(135deg, ${team.primary} 50%, ${team.secondary} 50%)` }} />
                <span className={`min-w-0 flex-1 truncate ${p.isUser ? 'font-black text-white' : 'text-white/85'}`}>
                  {p.isUser && '★ '}
                  {p.name} <span className="text-white/40">· {team.short}</span>
                </span>
                <span className="font-display text-base leading-none text-cyan-200 tabular-nums">{p.rating.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="mb-2 font-display text-xl text-white">YOUR IN-FORM PLAYERS</h3>
        {informs.length === 0 ? (
          <div className="text-xs text-white/55">Get one of your players into the Team of the Week to earn an in-form card: +{INFORM_BOOST} OVR for {INFORM_WEEKS} matchweeks (+1 if he makes it again while in form; up to {INFORM_SLOTS} players at once).</div>
        ) : (
          <div className="flex flex-wrap gap-3 pt-2">
            {informs.map((f) => {
              const card = userCards.get(f.id);
              return card ? (
                <div key={f.id} className="flex flex-col items-center gap-1">
                  <InformCard card={card} boost={f.boost} />
                  <span className="text-[10px] font-bold text-white/60">{f.weeksLeft} MW left</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
