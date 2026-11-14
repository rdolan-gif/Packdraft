import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Pause, Play, Radio, Shield, Swords, Scale, Target, Footprints, Hand, Flame } from 'lucide-react';
import type { FormationId, Lineup, ManagerId, PlayerCard, PlayerSeasonStats, TableRow, TacticalShout } from '../types/game';
import { INFORM_BOOST, INFORM_SLOTS, INFORM_WEEKS, ordinal, SeasonSim, TOTAL_MATCHWEEKS, TRANSFER_WINDOW_AFTER, USER_TEAM_ID, type DecisionContext, type TotwPick } from '../engine/seasonSimulator';
import { buildLiveMatchweek, chanceText, checkMilestones, liveTable, type LiveEvent, type LiveMatchweek, type Milestone, pointsHistory, snapshotTable } from '../engine/liveMatch';
import { TransferWindow } from './TransferWindow';
import { PlayerCardUI } from './PlayerCardUI';
import { LiveMatchHero, type Celebration, type FeedItem } from './season/LiveMatchHero';
import { AroundTheGrounds, LiveTable, TitleRaceChart } from './season/LivePanels';
import { ChaseBadges, MidSeasonAwards, MilestonePop } from './season/Moments';
import { recordTotw } from '../engine/stickerBook';
import { sfx } from '../engine/soundEffects';
import { burstAt, goldConfetti, rainbowConfetti, shakeScreen } from '../engine/fx';

type Speed = 1 | 2 | 4 | 'instant';
/** Match minutes per real second, and how long big moments hold the screen (relative to 1x). */
const RATE: Record<Exclude<Speed, 'instant'>, number> = { 1: 16, 2: 32, 4: 75 };
const HOLD: Record<Exclude<Speed, 'instant'>, number> = { 1: 1, 2: 0.6, 4: 0.3 };
const LEADER_KINDS = ['goals', 'assists', 'cleanSheets'] as const;
type LeaderKind = (typeof LEADER_KINDS)[number];

interface Props {
  sim: SeasonSim;
  onFinish: () => void;
  formationId: FormationId;
  lineup: Lineup;
  managerId: ManagerId;
  /** January signing: App updates the lineup and the sim. */
  onTransfer: (card: PlayerCard, slotId: string) => void;
}

/** Mutable playback state, kept in a ref so the 20fps loop never reads stale values. */
interface Playback {
  phase: 'idle' | 'live' | 'ft';
  live: LiveMatchweek | null;
  before: Record<string, TableRow> | null;
  minute: number;
  idx: number;
  holdUntil: number;
  lastT: number;
  momentum: number;
  seed: number;
  trailed: boolean;
  userFT: boolean;
  feed: FeedItem[];
  flashes: Record<number, number>;
  news: string | null;
  celebration: Celebration | null;
  leaders: Record<LeaderKind, PlayerSeasonStats[]> | null;
  totw: { mw: number; players: TotwPick[] } | null;
  informs: ReturnType<SeasonSim['activeInforms']> | null;
}

let feedKey = 0;

export function SeasonBroadcast({ sim, onFinish, formationId, lineup, managerId, onTransfer }: Props) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [informReveal, setInformReveal] = useState<{ key: number; cards: { card: PlayerCard; boost: number }[] } | null>(null);
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [decision, setDecision] = useState<DecisionContext | null>(null);
  const [tab, setTab] = useState<LeaderKind>('goals');
  const [instantRun, setInstantRun] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  const pb = useRef<Playback>({
    phase: 'idle', live: null, before: null, minute: 0, idx: 0, holdUntil: 0, lastT: 0, momentum: 0, seed: 0,
    trailed: false, userFT: false, feed: [], flashes: {}, news: null, celebration: null, leaders: null, totw: null, informs: null,
  });
  const queue = useRef<Milestone[]>([]);
  const seen = useRef(new Set<string>());
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const blockedRef = useRef(false);
  playingRef.current = playing;
  speedRef.current = speed;
  blockedRef.current = !!decision || transferOpen || awardsOpen;

  const st = pb.current;
  const isLive = st.phase === 'live';
  const holdScale = () => (speedRef.current === 'instant' ? 0.3 : HOLD[speedRef.current]);
  const pushFeed = (minute: number, text: string, tone: FeedItem['tone']) => {
    st.feed = [{ key: ++feedKey, minute, text, tone }, ...st.feed].slice(0, 8);
  };

  // ───────── one matchweek: start ─────────
  /** Kicks off the next matchweek. Returns false if the season paused (decision / window) or ended. */
  const startNext = useCallback(
    (shout?: TacticalShout): boolean => {
      if (sim.done) return false;
      if (!shout && sim.needsTransferWindow()) {
        setAwardsOpen(true);
        setPlaying(false);
        setInstantRun(false);
        sfx.fanfare();
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
      // Freeze everything a viewer could read the result from, then play the round.
      const before = snapshotTable(sim);
      const leaders = Object.fromEntries(LEADER_KINDS.map((k) => [k, sim.leaders(k, 10).map((x) => ({ ...x }))])) as Playback['leaders']; // copies: stats objects update as the round is played
      const totw = sim.latestTotw;
      const informs = sim.activeInforms();
      const results = sim.playMatchweek(shout);
      const live = buildLiveMatchweek(sim, results);
      Object.assign(st, {
        phase: 'live', live, before, minute: 0, idx: 0, momentum: 0, seed: Math.random() * 10, trailed: false, userFT: false,
        feed: [], flashes: {}, news: null, celebration: null, leaders, totw, informs, lastT: performance.now(), holdUntil: performance.now() + 400 * holdScale(),
      } satisfies Partial<Playback>);
      const u = results[0];
      const opp = sim.teamById[u.homeId === USER_TEAM_ID ? u.awayId : u.homeId];
      pushFeed(0, `Kick-off ${u.homeId === USER_TEAM_ID ? 'at home to' : 'away at'} ${opp.name}.`, 'whistle');
      sfx.whistle();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim],
  );

  // ───────── one matchweek: events ─────────
  const userMatchIdx = () => st.live!.results.findIndex((r) => r.involvesUser);
  const scoreAt = (minute: number, includeIdx: number) => {
    const r = st.live!.results[userMatchIdx()];
    let us = 0;
    let them = 0;
    st.live!.events.slice(0, includeIdx).forEach((e) => {
      if (e.kind !== 'goal' || st.live!.results[e.match] !== r || e.minute > minute) return;
      if (e.user) us++;
      else them++;
    });
    return { us, them };
  };

  /** Returns a hold in ms (0 = keep playing). */
  const playEvent = (e: LiveEvent, i: number, quiet: boolean): number => {
    const live = st.live!;
    const k = holdScale();
    const um = live.results[userMatchIdx()];
    const homeSign = (teamId: string) => (teamId === um.homeId ? 1 : -1);
    if (e.kind === 'goal') {
      const r = live.results[e.match];
      if (!r.involvesUser) {
        st.flashes = { ...st.flashes, [e.match]: e.minute };
        const h = sim.teamById[r.homeId];
        const a = sim.teamById[r.awayId];
        st.news = `${e.scorer} scores for ${sim.teamById[e.teamId].short} · ${h.short} v ${a.short}`;
        if (live.mw === TOTAL_MATCHWEEKS && st.before) {
          // Final day: the title can change hands with every goal.
          const prev = liveTable(sim, st.before, live, e.minute - 0.5)[0].teamId;
          const now = liveTable(sim, st.before, live, e.minute)[0].teamId;
          if (prev !== now && !quiet) {
            pushFeed(e.minute, `AS IT STANDS: ${sim.teamById[now].name} ${now === USER_TEAM_ID ? 'ARE CHAMPIONS!' : 'would be champions!'}`, 'news');
            if (now === USER_TEAM_ID) sfx.goalRoar(true);
            else sfx.groan();
            return 900 * k;
          }
        }
        if (!quiet && speedRef.current === 1) sfx.newsflash();
        return 0;
      }
      const { us, them } = scoreAt(e.minute, i);
      st.momentum = Math.max(-1, Math.min(1, st.momentum + 0.8 * homeSign(e.teamId)));
      if (e.user) {
        const nowUs = us + 1;
        const tally = live.events.slice(0, i + 1).filter((x) => x.kind === 'goal' && x.user && x.scorerId === e.scorerId).length;
        let label = 'GOAL!';
        if (tally === 3) label = 'HAT-TRICK!';
        else if (e.minute >= 85 && nowUs > them && us <= them) label = 'LATE WINNER!';
        else if (e.minute >= 85 && nowUs === them) label = 'LATE EQUALISER!';
        else if (nowUs === them) label = 'EQUALISER!';
        else if (tally === 2) label = 'BRACE!';
        const card = sim.teamById[USER_TEAM_ID].players.find((p) => p.id === e.scorerId)?.card;
        pushFeed(e.minute, `GOAL! ${e.scorer}${e.assist ? ` (assist ${e.assist})` : ''}. ${nowUs}-${them}.`, 'goal');
        if (quiet) return 0;
        st.celebration = { key: Date.now(), user: true, minute: e.minute, scorer: e.scorer, assist: e.assist, card, label, teamName: sim.teamById[USER_TEAM_ID].name, colour: '#10b981' };
        const special = label !== 'GOAL!' && label !== 'EQUALISER!';
        sfx.goalRoar(special || live.mw === 19 || live.mw === 38);
        shakeScreen(special ? 'heavy' : 'micro');
        const hero = document.querySelector('[data-shake-zone]')?.getBoundingClientRect();
        if (hero) burstAt(hero.left + hero.width / 2, hero.top + hero.height / 2, ['#10b981', '#facc15', '#ffffff'], special ? 90 : 45);
        if (label === 'HAT-TRICK!') rainbowConfetti();
        return (special ? 2800 : 2000) * k;
      }
      const opp = sim.teamById[e.teamId];
      if (them + 1 > us) st.trailed = true;
      pushFeed(e.minute, `${opp.short} score. ${e.scorer}. ${us}-${them + 1}.`, 'concede');
      if (quiet) return 0;
      st.celebration = { key: Date.now(), user: false, minute: e.minute, scorer: e.scorer, assist: e.assist, label: 'GOAL', teamName: opp.name, colour: opp.primary };
      sfx.groan();
      return 1100 * k;
    }
    if (e.kind === 'chance') {
      st.momentum = Math.max(-1, Math.min(1, st.momentum + 0.45 * homeSign(e.teamId)));
      pushFeed(e.minute, chanceText(e), e.user ? 'chance' : 'info');
      if (quiet) return 0;
      if (e.type === 'post') sfx.post();
      else sfx.ooh();
      return (e.type === 'post' ? 600 : 280) * k;
    }
    if (e.kind === 'chatter') {
      pushFeed(e.minute, e.text, 'info');
      return 0;
    }
    if (e.type === 'ht') {
      const { us, them } = scoreAt(45, i);
      pushFeed(45, `HALF-TIME. ${us}-${them}.`, 'whistle');
      if (!quiet) sfx.whistle();
      return 700 * k;
    }
    // full time in your match
    st.userFT = true;
    const { us, them } = scoreAt(999, i);
    const res = us > them ? 'W' : us < them ? 'L' : 'D';
    pushFeed(e.minute, `FULL-TIME. ${us}-${them}. ${res === 'W' ? (st.trailed ? 'What a comeback!' : 'Three points!') : res === 'D' ? 'A point apiece.' : 'Beaten.'}`, 'whistle');
    if (!quiet) {
      sfx.whistle(true);
      if (res === 'W') sfx.trophy();
      else if (res === 'L') sfx.sad();
    }
    return 600 * k;
  };

  // ───────── one matchweek: end ─────────
  const finishLive = (quiet: boolean) => {
    const live = st.live!;
    // Anything not yet shown (skip / instant) is applied silently.
    while (st.idx < live.events.length) {
      playEvent(live.events[st.idx], st.idx, true);
      st.idx++;
    }
    st.minute = live.end;
    st.phase = 'ft';
    st.celebration = null;
    st.news = null;
    st.leaders = null;
    st.totw = null;
    st.informs = null;
    // Team of the Week: honours go in the sticker book; reveal your in-form players.
    if (sim.newTotwIds.length) {
      recordTotw(sim.newTotwIds);
      if (!quiet) {
        const userPlayers = sim.teamById[USER_TEAM_ID].players;
        const cards = sim.newTotwIds
          .map((id) => ({ card: userPlayers.find((p) => p.id === id)?.card, boost: sim.informs[id]?.boost ?? 0 }))
          .filter((x): x is { card: PlayerCard; boost: number } => !!x.card);
        if (cards.length) setInformReveal({ key: Date.now(), cards });
      }
    }
    const found = checkMilestones(sim, seen.current);
    const r = live.results[userMatchIdx()];
    const userWon = r.homeId === USER_TEAM_ID ? r.homeGoals > r.awayGoals : r.awayGoals > r.homeGoals;
    if (st.trailed && userWon) found.push({ id: `comeback${live.mw}`, icon: '🔄', title: 'COMEBACK WIN!', sub: 'From behind to three points', size: 1 });
    queue.current.push(...(quiet ? found.filter((m) => m.size === 3).slice(-1) : found));
    if (sim.done) {
      setPlaying(false);
      setInstantRun(false);
      sfx.finalWhistle();
      if (sim.userPosition() === 1) goldConfetti(sim.table[USER_TEAM_ID].lost === 0 ? 1.6 : 1);
    }
    st.holdUntil = performance.now() + (quiet ? 0 : 1400 * holdScale());
  };

  /** Plays a whole matchweek with no animation (instant sim). */
  const quietStep = (): boolean => {
    if (st.phase === 'live') finishLive(true);
    if (!startNext()) return false;
    finishLive(true);
    return true;
  };

  // ───────── the loop ─────────
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - st.lastT) / 1000);
      st.lastT = now;
      if (now < st.holdUntil) return;
      if (st.celebration) {
        st.celebration = null;
        bump();
      }
      // Milestones queue up and take the screen one at a time.
      if (queue.current.length) {
        const m = queue.current.shift()!;
        setMilestone(m);
        if (m.size === 3) {
          goldConfetti(1.2);
          sfx.roar();
        } else if (m.tone === 'sad') sfx.sad();
        else sfx.stinger(m.size === 2 ? 'RISING_WORLD' : 'ELITE');
        st.holdUntil = now + (m.size === 3 ? 3200 : m.size === 2 ? 2300 : 1700) * Math.max(0.6, holdScale());
        return;
      }
      setMilestone((m) => (m ? null : m));
      if (st.phase === 'live') {
        if (!playingRef.current || blockedRef.current) return;
        const live = st.live!;
        const sp = speedRef.current === 'instant' ? 4 : speedRef.current;
        const big = live.mw === 19 || live.mw === TOTAL_MATCHWEEKS;
        let rate = big ? Math.min(RATE[sp], 16) : RATE[sp];
        // Broadcast pacing: rush through quiet spells, slow down as a chance builds in your match.
        const ui = userMatchIdx();
        const next = live.events.slice(st.idx).find((e) => e.kind === 'chance' || e.kind === 'whistle' || (e.kind === 'goal' && e.match === ui));
        const gap = next ? next.minute - st.minute : 99;
        if (gap > 6) rate *= 2.5;
        else if (gap < 1.5 && next && next.kind !== 'whistle') rate *= 0.55;
        st.minute = Math.min(live.end, st.minute + rate * dt);
        // momentum drifts towards whoever is creating more, with a little wobble
        const [xh, xa] = live.results[userMatchIdx()].xg ?? [1, 1];
        const target = ((xh - xa) / (xh + xa)) * 0.7 + Math.sin(st.minute / 6 + st.seed) * 0.3;
        st.momentum += (target - st.momentum) * 0.06;
        while (st.idx < live.events.length && live.events[st.idx].minute <= st.minute) {
          const e = live.events[st.idx];
          const hold = playEvent(e, st.idx, false);
          st.idx++;
          if (hold > 0) {
            st.minute = Math.max(st.minute, e.minute);
            st.holdUntil = now + hold;
            break;
          }
        }
        if (st.minute >= live.end && st.idx >= live.events.length) finishLive(false);
        bump();
        return;
      }
      // Between matchweeks: kick off the next one if we're playing.
      if (!playingRef.current || blockedRef.current || sim.done) return;
      if (speedRef.current === 'instant') {
        setPlaying(false);
        setInstantRun(true);
        return;
      }
      startNext();
      bump();
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // Instant sim: run until a decision or the end (batched to keep the UI responsive)
  useEffect(() => {
    if (!instantRun || decision || awardsOpen || transferOpen) return;
    const id = window.setTimeout(() => {
      let n = 0;
      while (n < 4 && quietStep()) n++;
      bump();
      if (sim.done) setInstantRun(false);
    }, 40);
    return () => clearTimeout(id);
  });

  useEffect(() => {
    if (!informReveal) return;
    sfx.stinger('ELITE');
    const id = window.setTimeout(() => setInformReveal(null), 2600);
    return () => clearTimeout(id);
  }, [informReveal]);

  const resume = () => {
    if (speedRef.current === 'instant') setInstantRun(true);
    else setPlaying(true);
  };

  // After the window, carry on at the chosen speed.
  const closeWindow = () => {
    setTransferOpen(false);
    bump();
    resume();
  };

  const choose = (shout: TacticalShout) => {
    sfx.select();
    setDecision(null);
    // Big matches are always shown live, whatever the speed.
    startNext(shout);
    setInstantRun(false);
    setPlaying(true);
    bump();
  };

  const skipToFT = () => {
    if (st.phase !== 'live') return;
    sfx.click();
    finishLive(false);
    bump();
  };

  // ───────── what's on screen ─────────
  const rows = isLive && st.before && st.live ? liveTable(sim, st.before, st.live, st.minute) : sim.sortedTable();
  const userRow = rows.find((r) => r.teamId === USER_TEAM_ID)!;
  const userPos = rows.indexOf(userRow) + 1;
  const shownWeek = isLive ? st.live!.mw : Math.min(sim.matchweek + (sim.done ? 0 : 1), TOTAL_MATCHWEEKS);
  const completed = isLive ? sim.matchweek - 1 : sim.matchweek;
  const seasonOver = sim.done && st.phase !== 'live';
  const history = useMemo(() => pointsHistory(sim), [sim, completed]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaders = st.leaders ? st.leaders[tab] : sim.leaders(tab, 10);
  const totw = isLive ? st.totw : sim.latestTotw;
  const informs = isLive && st.informs ? st.informs : sim.activeInforms();
  const bigMatch = st.live?.mw === 19 ? 'DERBY DAY · LIVE' : st.live?.mw === TOTAL_MATCHWEEKS ? 'CHAMPIONSHIP SUNDAY · LIVE' : null;
  const busy = playing || instantRun;

  const tickerText = useMemo(() => {
    const latest = sim.results[completed - 1] ?? [];
    const items = latest.filter((r) => r.headline).map((r) => `MW${r.matchweek}: ${r.headline}`);
    return items.length ? items.join('   •   ') : `Welcome to the PackDraft 38 Live Broadcast. ${sim.era.name} (${sim.era.years}): ${sim.era.tagline}`;
  }, [sim, completed]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-4 sm:px-4">
      {/* Broadcast header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950 via-black to-emerald-950">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </span>
            <span className="font-display text-2xl leading-none text-white sm:text-3xl">
              MATCHWEEK {shownWeek} <span className="text-white/40">/ 38</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-lg bg-white/10 px-2 py-1 font-black text-yellow-300">{userRow.played ? ordinal(userPos) : '–'}</span>
            <span className="font-bold text-white/80">
              {userRow.won}W-{userRow.drawn}D-{userRow.lost}L · <span className="text-yellow-300">{userRow.points} pts</span>
            </span>
          </div>
          <ChaseBadges sim={sim} upto={completed} />
          <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white/60" title={sim.era.tagline}>
            {sim.era.name} · {sim.era.years}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {!seasonOver && (
              <button
                onClick={() => {
                  sfx.click();
                  if (busy) {
                    setPlaying(false);
                    setInstantRun(false);
                  } else resume();
                }}
                disabled={!!decision || transferOpen || awardsOpen}
                className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-black text-black transition hover:bg-emerald-400 disabled:opacity-40"
              >
                {busy ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {busy ? 'Pause' : sim.matchweek === 0 ? 'Kick Off' : 'Play'}
              </button>
            )}
            {([1, 2, 4, 'instant'] as Speed[]).map((s) => (
              <button
                key={String(s)}
                onClick={() => {
                  sfx.click();
                  setSpeed(s);
                  speedRef.current = s;
                  if (s === 'instant' && busy) {
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
            {!seasonOver && (
              <button
                onClick={() => {
                  sfx.click();
                  setPlaying(false);
                  setInstantRun(true);
                }}
                disabled={!!decision || transferOpen || awardsOpen}
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40"
                title="Simulate to the next big moment or the end"
              >
                <FastForward className="h-3.5 w-3.5" />{' '}
                {sim.matchweek < 19 ? 'Sim to Derby Day' : !sim.transferDone && sim.matchweek <= TRANSFER_WINDOW_AFTER ? 'Sim to January Window' : sim.matchweek < 38 ? 'Sim to Final Day' : 'Sim to End'}
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
          <div className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-all duration-500" style={{ width: `${(completed / 38) * 100}%` }} />
        </div>
      </div>

      {/* Phone order: your match, around the grounds, table, title race. Desktop: two columns. */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-1">
          <LiveMatchHero sim={sim} live={st.live} minute={st.minute} momentum={st.momentum} feed={st.feed} celebration={st.celebration} finished={st.phase === 'ft'} onSkip={skipToFT} bigMatch={bigMatch} />
          {st.phase !== 'live' && !busy && !seasonOver && (
            <button
              onClick={() => {
                sfx.click();
                resume();
              }}
              disabled={!!decision || transferOpen || awardsOpen}
              className="animate-pop rounded-2xl bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400 py-3 font-display text-3xl tracking-wider text-black shadow-xl shadow-emerald-500/20 transition hover:scale-[1.01]"
            >
              {sim.matchweek === 0 ? 'KICK OFF THE SEASON' : 'PLAY NEXT MATCHWEEK'}
            </button>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <AroundTheGrounds sim={sim} live={st.live} minute={st.minute} flashes={st.flashes} before={st.before} />
          {st.news && isLive && (
            <div key={st.news} className="animate-pop rounded-xl border border-sky-300/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-100">
              📡 {st.news}
            </div>
          )}
          <div className="hidden lg:block">
            <TitleRaceChart sim={sim} history={history} upto={completed} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2">
          <LiveTable sim={sim} rows={rows} before={st.before} live={isLive} />
          <div className="lg:hidden">
            <TitleRaceChart sim={sim} history={history} upto={completed} />
          </div>
        </div>
      </div>

      {/* Team of the Week + your in-form players */}
      <TotwPanel sim={sim} totw={totw} informs={informs} />

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

      {seasonOver && (
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

      {milestone && <MilestonePop key={milestone.id} m={milestone} />}
      {decision && <DecisionOverlay d={decision} sim={sim} onChoose={choose} />}
      {awardsOpen && (
        <MidSeasonAwards
          sim={sim}
          onContinue={() => {
            sfx.select();
            setAwardsOpen(false);
            setTransferOpen(true);
          }}
        />
      )}
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

const Leaders = memo(function Leaders({ rows, kind, sim }: { rows: PlayerSeasonStats[]; kind: 'goals' | 'assists' | 'cleanSheets'; sim: SeasonSim }) {
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
});

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

const TotwPanel = memo(function TotwPanel({ sim, totw, informs }: { sim: SeasonSim; totw: { mw: number; players: TotwPick[] } | null; informs: ReturnType<SeasonSim['activeInforms']> }) {
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
});
