// Live matchday playback: turns a played matchweek into a minute-by-minute timeline
// (goals everywhere, near misses in your match, commentary) plus season milestones.
import type { MatchResult, TableRow } from '../types/game';
import { formatMinute, type SeasonSim, TOTAL_MATCHWEEKS, USER_TEAM_ID } from './seasonSimulator';

export type LiveEvent =
  | { kind: 'goal'; minute: number; match: number; teamId: string; scorer: string; scorerId: string; assist: string | null; user: boolean }
  | { kind: 'chance'; minute: number; teamId: string; player: string; type: 'save' | 'post' | 'wide' | 'block'; keeper?: string; user: boolean }
  | { kind: 'chatter'; minute: number; text: string }
  | { kind: 'whistle'; minute: number; type: 'ht' | 'ft' };

export interface LiveMatchweek {
  mw: number;
  results: MatchResult[];
  events: LiveEvent[];
  end: number; // last minute of the longest match
  userEnd: number;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function buildLiveMatchweek(sim: SeasonSim, results: MatchResult[]): LiveMatchweek {
  const mw = results[0]?.matchweek ?? sim.matchweek;
  const events: LiveEvent[] = [];
  const user = results.find((r) => r.involvesUser);
  results.forEach((r, i) =>
    r.goals.forEach((g) =>
      events.push({ kind: 'goal', minute: g.minute, match: i, teamId: g.teamId, scorer: g.scorerName, scorerId: g.scorerId, assist: g.assistName, user: g.teamId === USER_TEAM_ID }),
    ),
  );
  const lastGoal = Math.max(90, ...results.flatMap((r) => r.goals.map((g) => g.minute)));
  const userEnd = Math.max(90 + 2 + Math.floor(Math.random() * 4), ...(user?.goals.map((g) => g.minute) ?? []));
  if (user) {
    user.chances?.forEach((c) => events.push({ kind: 'chance', minute: c.minute, teamId: c.teamId, player: c.playerName, type: c.kind, keeper: c.keeper, user: c.teamId === USER_TEAM_ID }));
    const us = sim.teamById[USER_TEAM_ID];
    const them = sim.teamById[user.homeId === USER_TEAM_ID ? user.awayId : user.homeId];
    const busy = new Set(events.map((e) => e.minute));
    for (let m = 6 + Math.floor(Math.random() * 6); m < 88; m += 9 + Math.floor(Math.random() * 9)) {
      if (busy.has(m) || m === 45 || m === 46) continue;
      events.push({ kind: 'chatter', minute: m, text: chatter(us.players.map((p) => p.name), them.players.map((p) => p.name), them.name) });
    }
  }
  events.push({ kind: 'whistle', minute: 45, type: 'ht' });
  events.push({ kind: 'whistle', minute: userEnd, type: 'ft' });
  const order = { chatter: 0, chance: 1, goal: 2, whistle: 3 } as const;
  events.sort((a, b) => a.minute - b.minute || order[a.kind] - order[b.kind]);
  return { mw, results, events, end: Math.max(lastGoal, userEnd), userEnd };
}

function chatter(ours: string[], theirs: string[], oppName: string) {
  const o = pick(ours);
  const t = pick(theirs);
  return pick([
    `${o} wins it back in midfield and drives forward.`,
    `${o} sprays a lovely ball out wide.`,
    `Corner to us. ${o} goes up for it…`,
    `${t} is booked for a cynical foul on ${o}.`,
    `${oppName} are pressing high. ${o} keeps his cool.`,
    `${o} goes down. Nothing given! The crowd are fuming.`,
    `Lovely one-two between ${o} and ${pick(ours)}.`,
    `${t} tries his luck from distance. Well over.`,
    `${o} slides in with a huge tackle. The crowd love it.`,
    `Tempo has dropped. ${oppName} knocking it about at the back.`,
    `${o} skins his man down the line!`,
    `Free kick in a dangerous area. ${o} stands over it…`,
  ]);
}

export function chanceText(e: Extract<LiveEvent, { kind: 'chance' }>) {
  switch (e.type) {
    case 'save':
      return `${e.player} lets fly. Brilliant save by ${e.keeper ?? 'the keeper'}!`;
    case 'post':
      return `${e.player} smashes it… OFF THE POST!`;
    case 'wide':
      return `${e.player} drags it just wide. So close!`;
    case 'block':
      return `${e.player} shoots. Blocked on the line!`;
  }
}

/** Score of each match at a given minute. */
export function scoresAt(live: LiveMatchweek, minute: number): [number, number][] {
  return live.results.map((r) => {
    let h = 0;
    let a = 0;
    r.goals.forEach((g) => {
      if (g.minute > minute) return;
      if (g.teamId === r.homeId) h++;
      else a++;
    });
    return [h, a];
  });
}

/** League table "as it stands": the table before this matchweek plus the scores so far. */
export function liveTable(sim: SeasonSim, before: Record<string, TableRow>, live: LiveMatchweek, minute: number): TableRow[] {
  const rows: Record<string, TableRow> = {};
  Object.values(before).forEach((r) => (rows[r.teamId] = { ...r, form: [...r.form] }));
  const scores = scoresAt(live, minute);
  live.results.forEach((r, i) => {
    const [h, a] = scores[i];
    const H = rows[r.homeId];
    const A = rows[r.awayId];
    H.played++;
    A.played++;
    H.gf += h;
    H.ga += a;
    A.gf += a;
    A.ga += h;
    if (h > a) {
      H.won++;
      A.lost++;
      H.points += 3;
    } else if (h < a) {
      A.won++;
      H.lost++;
      A.points += 3;
    } else {
      H.drawn++;
      A.drawn++;
      H.points++;
      A.points++;
    }
  });
  return Object.values(rows).sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || sim.teamById[a.teamId].name.localeCompare(sim.teamById[b.teamId].name),
  );
}

export function snapshotTable(sim: SeasonSim): Record<string, TableRow> {
  return Object.fromEntries(Object.entries(sim.table).map(([k, r]) => [k, { ...r, form: [...r.form] }]));
}

/** Points after each matchweek for every club (index 0 = before MW1). */
export function pointsHistory(sim: SeasonSim): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  sim.teams.forEach((t) => (out[t.id] = [0]));
  sim.results.forEach((round) => {
    const add: Record<string, number> = {};
    round.forEach((r) => {
      add[r.homeId] = r.homeGoals > r.awayGoals ? 3 : r.homeGoals === r.awayGoals ? 1 : 0;
      add[r.awayId] = r.awayGoals > r.homeGoals ? 3 : r.homeGoals === r.awayGoals ? 1 : 0;
    });
    sim.teams.forEach((t) => out[t.id].push(out[t.id][out[t.id].length - 1] + (add[t.id] ?? 0)));
  });
  return out;
}

// ───────────────────────────── streaks & milestones ─────────────────────────────

/** Your run so far. `upto` limits it to the first N matchweeks (so a live match isn't spoiled). */
export function userStreaks(sim: SeasonSim, upto = sim.results.length) {
  const res = sim.results.slice(0, upto).map((round) => {
    const r = round.find((x) => x.involvesUser)!;
    const home = r.homeId === USER_TEAM_ID;
    const us = home ? r.homeGoals : r.awayGoals;
    const them = home ? r.awayGoals : r.homeGoals;
    return us > them ? 'W' : us < them ? 'L' : 'D';
  });
  let win = 0;
  for (let i = res.length - 1; i >= 0 && res[i] === 'W'; i--) win++;
  let unbeaten = 0;
  for (let i = res.length - 1; i >= 0 && res[i] !== 'L'; i--) unbeaten++;
  const won = res.filter((x) => x === 'W').length;
  const drawn = res.filter((x) => x === 'D').length;
  const lost = res.length - won - drawn;
  const played = res.length;
  const points = won * 3 + drawn;
  return {
    win,
    unbeaten,
    won,
    drawn,
    lost,
    played,
    points,
    perfect: played > 0 && won === played,
    invincible: played > 0 && lost === 0,
    pace: played ? Math.round((points / played) * TOTAL_MATCHWEEKS) : 0,
    results: res,
  };
}

export interface Milestone {
  id: string;
  icon: string;
  title: string;
  sub: string;
  /** 3 = huge (confetti, roar), 2 = big, 1 = toast. Negative tone for runs ending. */
  size: 1 | 2 | 3;
  tone?: 'sad';
}

/** Milestones reached after the matchweek just played. `seen` stops repeats within a season. */
export function checkMilestones(sim: SeasonSim, seen: Set<string>): Milestone[] {
  const out: Milestone[] = [];
  const add = (m: Milestone) => {
    if (seen.has(m.id)) return;
    seen.add(m.id);
    out.push(m);
  };
  const st = userStreaks(sim);
  const row = sim.table[USER_TEAM_ID];
  const table = sim.sortedTable();
  const pos = table.findIndex((r) => r.teamId === USER_TEAM_ID) + 1;
  const left = TOTAL_MATCHWEEKS - sim.matchweek;
  const last = st.results[st.results.length - 1];

  // Title clinched: nobody can catch you.
  const rivalsBest = Math.max(...table.filter((r) => r.teamId !== USER_TEAM_ID).map((r) => r.points + left * 3));
  if (row.points > rivalsBest)
    add({ id: 'clinched', icon: '🏆', title: 'CHAMPIONS!', sub: left > 0 ? `Title sealed with ${left} game${left === 1 ? '' : 's'} to spare` : 'Premier League Champions', size: 3 });
  else if (left === 0 && pos === 1) add({ id: 'clinched', icon: '🏆', title: 'CHAMPIONS!', sub: 'Won it on the final day!', size: 3 });
  const fifthBest = table.filter((r) => r.teamId !== USER_TEAM_ID).slice(3).reduce((m, r) => Math.max(m, r.points + left * 3), 0);
  if (row.points > fifthBest && left > 0) add({ id: 'top4', icon: '⭐', title: 'CHAMPIONS LEAGUE SECURED', sub: `Top four locked in with ${left} to play`, size: 2 });
  if (pos === 1 && sim.matchweek >= 3) add({ id: 'top', icon: '👑', title: 'TOP OF THE LEAGUE', sub: `Matchweek ${sim.matchweek}: you lead the way`, size: 2 });

  // Perfect start / unbeaten / streaks
  for (const n of [5, 10, 15, 19, 25, 30, 35, 37])
    if (st.perfect && row.played === n)
      add({ id: `perfect${n}`, icon: '💎', title: `PERFECT START: ${n}-0`, sub: n === 37 ? 'One more win for 38-0. History is 90 minutes away.' : `${TOTAL_MATCHWEEKS - n} more wins for the impossible 38-0`, size: n >= 19 ? 3 : 2 });
  for (const n of [10, 19, 25, 30, 37])
    if (st.invincible && !st.perfect && row.played === n)
      add({ id: `unbeaten${n}`, icon: '🛡️', title: `UNBEATEN IN ${n}`, sub: n === 19 ? 'Halfway to Invincibility' : n === 37 ? 'One game from Invincibility' : 'The Invincibles dream is alive', size: n >= 30 ? 3 : 2 });
  for (const n of [3, 5, 8, 10, 15, 20, 25, 30])
    if (st.win === n && !st.perfect) add({ id: `streak${n}`, icon: '🔥', title: `${n} WINS IN A ROW`, sub: n >= 10 ? 'Unstoppable' : 'On fire', size: n >= 10 ? 2 : 1 });
  // Runs ending: a bit of heartbreak keeps the chase meaningful.
  if (last === 'D' && row.drawn === 1 && row.lost === 0 && row.played >= 5)
    add({ id: 'perfectEnds', icon: '💔', title: 'PERFECT RUN OVER', sub: `${row.played - 1}-0 ends in a draw. Still unbeaten…`, size: 1, tone: 'sad' });
  if (last === 'L' && row.lost === 1 && row.played >= 8)
    add({ id: 'unbeatenEnds', icon: '💔', title: 'UNBEATEN RUN OVER', sub: `First defeat after ${row.played - 1} games`, size: 1, tone: 'sad' });

  // Season records
  if (row.points >= 100) add({ id: 'pts100', icon: '💯', title: 'CENTURIONS!', sub: '100 points. Record territory.', size: 3 });
  else if (row.points >= 90) add({ id: 'pts90', icon: '📈', title: '90 POINTS', sub: 'An elite season', size: 1 });
  if (row.gf >= 100) add({ id: 'gf100', icon: '⚽', title: '100 LEAGUE GOALS', sub: 'A century of goals', size: 2 });
  for (const s of Object.values(sim.stats))
    if (s.isUser)
      for (const n of [20, 30, 36])
        if (s.goals >= n) add({ id: `boot${n}:${s.id}`, icon: '👟', title: `${s.name.toUpperCase()} HITS ${n}`, sub: n === 36 ? 'Joint Premier League record!' : `${n} league goals this season`, size: n >= 30 ? 2 : 1 });
  return out;
}

export { formatMinute };
