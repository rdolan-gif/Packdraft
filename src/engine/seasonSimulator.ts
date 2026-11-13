import { FORMATIONS, positionGroup } from '../data/formations';
import { RIVAL_TEAMS, type RivalPlayer } from '../data/rivalTeams';
import type {
  FormationId,
  GoalEvent,
  Grade,
  LeaguePlayer,
  Lineup,
  ManagerId,
  MatchResult,
  PlayerCard,
  PlayerSeasonStats,
  SeasonSummary,
  SimTeam,
  TableRow,
  TacticalShout,
  TeamRating,
} from '../types/game';
import { getClub } from '../data/clubs';

export const USER_TEAM_ID = 'USER';
export const TOTAL_MATCHWEEKS = 38;
export const BIG_MATCH_WEEKS = [19, 38];

// ───────────────────────────── helpers ─────────────────────────────

function weighted<T>(items: T[], weight: (t: T) => number, rng: () => number): T | null {
  const total = items.reduce((s, i) => s + Math.max(0, weight(i)), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const i of items) {
    r -= Math.max(0, weight(i));
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

export function formatMinute(m: number) {
  return m > 90 ? `90+${m - 90}'` : `${m}'`;
}

function shuffle<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ───────────────────────────── league construction ─────────────────────────────

function userPlayers(formationId: FormationId, lineup: Lineup): LeaguePlayer[] {
  const formation = FORMATIONS[formationId];
  return formation.slots
    .filter((s) => lineup[s.id])
    .map((s) => {
      const c = lineup[s.id]!;
      const g = positionGroup(s.label);
      const baseScore =
        s.label === 'ST' ? 4.6 : s.label === 'RW' || s.label === 'LW' ? 4.2 : s.label === 'CAM' ? 3.2 : s.label === 'RM' || s.label === 'LM' ? 2.6 : s.label === 'CM' ? 1.8 : s.label === 'CDM' ? 0.8 : g === 'DEF' ? (s.label === 'CB' ? 0.55 : 0.6) : 0;
      const baseAssist =
        s.label === 'CAM' ? 4 : s.label === 'RW' || s.label === 'LW' ? 3.2 : s.label === 'RM' || s.label === 'LM' ? 3 : s.label === 'CM' ? 2.6 : s.label === 'ST' ? 1.7 : s.label === 'CDM' ? 1 : s.label === 'RB' || s.label === 'LB' ? 1.7 : s.label === 'CB' ? 0.3 : 0.1;
      const shoMul = Math.pow(c.stats.sho / 78, 1.6);
      const pasMul = Math.pow(c.stats.pas / 78, 2.2);
      const archScore = ['Poacher', 'Complete Forward', 'Target Man', 'Inside Forward'].includes(c.archetype) ? 1.2 : 1;
      const archAssist = ['Advanced Playmaker', 'Winger', 'Regista', 'Wing-Back'].includes(c.archetype) ? 1.25 : 1;
      return {
        id: c.id,
        name: c.shortName,
        teamId: USER_TEAM_ID,
        pos: s.label,
        isUser: true,
        card: c,
        scoreWeight: s.label === 'GK' ? 0 : Math.pow(baseScore * shoMul * archScore, 0.75),
        assistWeight: baseAssist * pasMul * archAssist,
      };
    });
}

function rivalPlayers(code: string, roster: RivalPlayer[], reserves: RivalPlayer[], drafted: Set<string>): LeaguePlayer[] {
  const spare = reserves.filter((r) => !drafted.has(r.id));
  const out: RivalPlayer[] = [];
  let academy = 0;
  roster.forEach((p) => {
    if (!drafted.has(p.id)) return out.push(p);
    const idx = spare.findIndex((r) => (p.pos === 'GK') === (r.pos === 'GK'));
    if (idx >= 0) out.push(spare.splice(idx, 1)[0]);
    else {
      academy++; // unique per slot: two drafted strikers from one club used to share one stats row
      out.push({ ...p, id: `${code}_academy_${academy}`, name: `${code} Academy ${p.pos}${academy > 1 ? ` ${academy}` : ''}` });
    }
  });
  return out.map((p) => ({
    id: `${code}:${p.id}`,
    name: p.name,
    teamId: code,
    pos: p.pos,
    isUser: false,
    scoreWeight: Math.pow(p.sw, 0.6),
    assistWeight: Math.pow(p.aw, 0.7),
  }));
}

export function buildLeague(opts: {
  teamName: string;
  formationId: FormationId;
  lineup: Lineup;
  rating: TeamRating;
  managerId: ManagerId;
  rng?: () => number;
}): SimTeam[] {
  const rng = opts.rng ?? Math.random;
  const drafted = new Set(Object.values(opts.lineup).filter(Boolean).map((c) => c!.basePlayerId));
  const user: SimTeam = {
    id: USER_TEAM_ID,
    name: opts.teamName,
    short: opts.teamName.slice(0, 3).toUpperCase(),
    primary: '#10b981',
    secondary: '#facc15',
    attack: opts.rating.attack,
    defence: opts.rating.defence,
    isUser: true,
    players: userPlayers(opts.formationId, opts.lineup),
  };
  const rivals: SimTeam[] = RIVAL_TEAMS.map((t) => {
    const s = t.strength + (rng() * 3 - 1.5);
    const tilt = t.style === 'attack' ? 1.2 : t.style === 'defensive' ? -1.2 : 0;
    const club = getClub(t.code);
    return {
      id: t.code,
      name: t.name,
      short: t.short,
      primary: club.primary,
      secondary: club.secondary,
      attack: s + tilt,
      defence: s - tilt,
      isUser: false,
      players: rivalPlayers(t.code, t.players, t.reserves, drafted),
    };
  });
  return [user, ...rivals];
}

// ───────────────────────────── fixtures ─────────────────────────────

/** Double round robin via the circle method. Returns 38 rounds of 10 [home, away] pairs. */
export function buildFixtures(teamIds: string[], rng: () => number): [string, string][][] {
  const ids = shuffle([...teamIds], rng);
  const n = ids.length;
  const rounds: [string, string][][] = [];
  const arr = [...ids];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()!);
  }
  const second = rounds.map((round) => round.map(([h, a]) => [a, h] as [string, string]));
  // Shuffle the return legs, avoiding any team meeting the same opponent in consecutive rounds.
  let best = shuffle([...second], rng);
  for (let tries = 0; tries < 200 && backToBackCount([...rounds, ...best]) > 0; tries++) best = shuffle([...second], rng);
  return [...rounds, ...best];
}

const pairKey = (h: string, a: string) => (h < a ? `${h}|${a}` : `${a}|${h}`);

/** Number of fixtures that repeat a pairing from the previous round. */
export function backToBackCount(rounds: [string, string][][]): number {
  let n = 0;
  for (let r = 1; r < rounds.length; r++) {
    const prev = new Set(rounds[r - 1].map(([h, a]) => pairKey(h, a)));
    n += rounds[r].filter(([h, a]) => prev.has(pairKey(h, a))).length;
  }
  return n;
}

// ───────────────────────────── season ─────────────────────────────

export interface DecisionContext {
  matchweek: number;
  opponentId: string;
  home: boolean;
  title: string;
  stakes: string[];
}

export class SeasonSim {
  teams: SimTeam[];
  teamById: Record<string, SimTeam>;
  fixtures: [string, string][][];
  table: Record<string, TableRow>;
  stats: Record<string, PlayerSeasonStats>;
  results: MatchResult[][] = [];
  matchweek = 0; // number of matchweeks played
  shouts: { mw: number; shout: TacticalShout; result: 'W' | 'D' | 'L' }[] = [];
  managerId: ManagerId;
  rating: TeamRating;
  rng: () => number;

  constructor(teams: SimTeam[], managerId: ManagerId, rating: TeamRating, rng: () => number = Math.random) {
    this.teams = teams;
    this.managerId = managerId;
    this.rating = rating;
    this.rng = rng;
    this.teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
    this.fixtures = buildFixtures(teams.map((t) => t.id), rng);
    this.table = Object.fromEntries(
      teams.map((t) => [t.id, { teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] }]),
    );
    this.stats = {};
    teams.forEach((t) =>
      t.players.forEach((p) => {
        this.stats[p.id] = { id: p.id, name: p.name, teamId: t.id, isUser: p.isUser, goals: 0, assists: 0, cleanSheets: 0, apps: 0, ratingSum: 0 };
      }),
    );
  }

  get done() {
    return this.matchweek >= TOTAL_MATCHWEEKS;
  }

  sortedTable(): TableRow[] {
    return Object.values(this.table).sort(
      (a, b) =>
        b.points - a.points ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        this.teamById[a.teamId].name.localeCompare(this.teamById[b.teamId].name),
    );
  }

  userPosition(): number {
    return this.sortedTable().findIndex((r) => r.teamId === USER_TEAM_ID) + 1;
  }

  userFixture(roundIdx: number): { opponentId: string; home: boolean } {
    const f = this.fixtures[roundIdx].find(([h, a]) => h === USER_TEAM_ID || a === USER_TEAM_ID)!;
    return f[0] === USER_TEAM_ID ? { opponentId: f[1], home: true } : { opponentId: f[0], home: false };
  }

  /** MW19: reorder the remaining rounds so the user faces their closest table rival. */
  private arrangeDerby() {
    const table = this.sortedTable();
    const pos = table.findIndex((r) => r.teamId === USER_TEAM_ID);
    const me = table[pos];
    const candidates = table
      .filter((r) => r.teamId !== USER_TEAM_ID)
      .sort((a, b) => Math.abs(a.points - me.points) - Math.abs(b.points - me.points) || (pos === 0 ? 0 : a.points > me.points ? -1 : 1));
    const start = this.matchweek; // index of round about to be played
    const lastOpp = start > 0 ? this.userFixture(start - 1).opponentId : null;
    const before = backToBackCount(this.fixtures);
    for (const strict of [true, false]) {
      for (const c of candidates) {
        if (c.teamId === lastOpp) continue; // never a rematch of last week
        for (let r = start; r < this.fixtures.length; r++) {
          if (this.userFixture(r).opponentId !== c.teamId) continue;
          [this.fixtures[start], this.fixtures[r]] = [this.fixtures[r], this.fixtures[start]];
          if (!strict || backToBackCount(this.fixtures) <= before) return;
          [this.fixtures[start], this.fixtures[r]] = [this.fixtures[r], this.fixtures[start]]; // undo, try next
        }
      }
    }
  }

  /** Called before playing the next matchweek. Returns a decision context if the sim should pause. */
  checkDecision(): DecisionContext | null {
    const mw = this.matchweek + 1;
    if (mw === 19) {
      this.arrangeDerby();
      const { opponentId, home } = this.userFixture(this.matchweek);
      const table = this.sortedTable();
      const me = table.find((r) => r.teamId === USER_TEAM_ID)!;
      const opp = table.find((r) => r.teamId === opponentId)!;
      const myPos = this.userPosition();
      const oppPos = table.indexOf(opp) + 1;
      const gap = me.points - opp.points;
      const stakes = [
        `You: ${ordinal(myPos)} · ${me.points} pts   |   ${this.teamById[opponentId].name}: ${ordinal(oppPos)} · ${opp.points} pts`,
        gap === 0
          ? 'Level on points. Winner takes the high ground.'
          : gap > 0
            ? `You lead them by ${gap}. Win and you open a ${gap + 3}-point gap.`
            : -gap < 3
              ? `They lead you by ${-gap}. Win and you go ${3 + gap} clear.`
              : -gap === 3
                ? 'They lead you by 3. Win and you draw level.'
                : `They lead you by ${-gap}. Win and the gap closes to ${-gap - 3}.`,
      ];
      if (me.lost === 0) stakes.push(`Unbeaten in ${me.played}. The Invincibles dream is alive.`);
      return { matchweek: mw, opponentId, home, title: 'Derby Day · Mid-Season Six-Pointer', stakes };
    }
    if (mw === 38) {
      const table = this.sortedTable();
      const pos = this.userPosition();
      const me = table[pos - 1];
      const stakes: string[] = [];
      const first = table[0];
      const second = table[1];
      if (pos === 1 && me.points - second.points <= 3) stakes.push(`Title race: you lead ${this.teamById[second.teamId].name} by ${me.points - second.points}.`);
      if (pos > 1 && first.points - me.points <= 3) stakes.push(`Title race: ${this.teamById[first.teamId].name} lead you by ${first.points - me.points}.`);
      const fourth = table[3];
      const fifth = table[4];
      if (pos <= 4 && pos > 1 && me.points - fifth.points <= 3) stakes.push(`Top 4 on the line: ${me.points - fifth.points} pts clear of 5th.`);
      if (pos >= 5 && fourth.points - me.points <= 3) stakes.push(`Champions League chase: ${fourth.points - me.points} pts behind 4th.`);
      const inTitleRace = pos === 1 || first.points - me.points <= 3;
      if (me.lost === 0 && inTitleRace) stakes.push(me.drawn === 0 ? `37-0-0. One more win for a PERFECT 38-0 season.` : `Unbeaten in 37. Ninety minutes from Invincibility.`);
      else if (me.lost === 0) stakes.push(`Unbeaten in 37. Finish the job: no defeats all season.`);
      const safe = table[16]; // 17th
      const drop = table[17]; // 18th
      if (pos === 17 && me.points - drop.points <= 3) stakes.push(`Relegation dogfight: just ${me.points - drop.points} pts above the drop.`);
      else if (pos >= 18 && safe.points - me.points <= 3) stakes.push(`Need a result to survive: ${safe.points - me.points} pts from safety.`);
      else if (pos >= 18) stakes.push(`Relegated already. Play for pride.`);
      if (!stakes.length) return null;
      const { opponentId, home } = this.userFixture(this.matchweek);
      return { matchweek: mw, opponentId, home, title: 'Championship Sunday · Final Day', stakes };
    }
    return null;
  }

  private lambda(att: SimTeam, def: SimTeam, home: boolean) {
    const diff = att.attack - def.defence;
    return 1.2 * Math.exp(diff * 0.07) * (home ? 1.1 : 0.92);
  }

  private playMatch(mw: number, homeId: string, awayId: string, shout?: TacticalShout): MatchResult {
    const home = this.teamById[homeId];
    const away = this.teamById[awayId];
    let lh = this.lambda(home, away, true);
    let la = this.lambda(away, home, false);
    const userIsHome = home.isUser;
    const involvesUser = home.isUser || away.isUser;
    if (involvesUser && shout) {
      const [forMul, againstMul] = shout === 'attack' ? [1.35, 1.3] : shout === 'bus' ? [0.75, 0.65] : [1, 1];
      if (userIsHome) {
        lh *= forMul;
        la *= againstMul;
      } else {
        la *= forMul;
        lh *= againstMul;
      }
    }
    const goals: GoalEvent[] = [];
    let hg = 0;
    let ag = 0;
    const stoppage = 2 + Math.floor(this.rng() * 4);
    const fergie = this.managerId === 'fergie_time' && involvesUser;
    for (let m = 1; m <= 90 + stoppage; m++) {
      // slightly more goals late on
      const tMul = m > 75 ? 1.18 : m < 10 ? 0.8 : 1;
      let ph = (lh / 90) * tMul;
      let pa = (la / 90) * tMul;
      if (fergie && m > 75) {
        const userGoals = userIsHome ? hg : ag;
        const oppGoals = userIsHome ? ag : hg;
        const d = userGoals - oppGoals;
        if (d === 0 || d === -1) {
          if (userIsHome) ph *= 2;
          else pa *= 2;
        }
      }
      if (this.rng() < ph) {
        hg++;
        goals.push(this.makeGoal(home, m));
      }
      if (this.rng() < pa) {
        ag++;
        goals.push(this.makeGoal(away, m));
      }
    }
    const result: MatchResult = { matchweek: mw, homeId, awayId, homeGoals: hg, awayGoals: ag, goals, headline: null, involvesUser, shout };
    result.headline = this.headline(result);
    return result;
  }

  private makeGoal(team: SimTeam, minute: number): GoalEvent {
    const scorer = weighted(team.players, (p) => p.scoreWeight, this.rng)!;
    const assist = this.rng() < 0.74 ? weighted(team.players.filter((p) => p.id !== scorer.id), (p) => p.assistWeight, this.rng) : null;
    return { minute, scorerId: scorer.id, scorerName: scorer.name, assistId: assist?.id ?? null, assistName: assist?.name ?? null, teamId: team.id };
  }

  private headline(r: MatchResult): string | null {
    const h = this.teamById[r.homeId];
    const a = this.teamById[r.awayId];
    const winner = r.homeGoals > r.awayGoals ? h : r.awayGoals > r.homeGoals ? a : null;
    const loser = winner === h ? a : winner === a ? h : null;
    const margin = Math.abs(r.homeGoals - r.awayGoals);
    const byScorer = new Map<string, number>();
    r.goals.forEach((g) => byScorer.set(g.scorerName + '|' + g.teamId, (byScorer.get(g.scorerName + '|' + g.teamId) ?? 0) + 1));
    const hatTrick = [...byScorer.entries()].find(([, n]) => n >= 3);
    const last = r.goals[r.goals.length - 1];
    const lateWinner = winner && last && last.minute >= 86 && last.teamId === winner.id && margin === 1;
    if (!r.involvesUser && this.rng() > 0.25 && !hatTrick) return null;
    if (hatTrick) {
      const [key, n] = hatTrick;
      const nm = key.split('|')[0];
      return n >= 4 ? `${nm} scores ${n}! Unplayable.` : `${nm} hat-trick! Match ball secured.`;
    }
    if (lateWinner) {
      return this.managerId === 'fergie_time' && winner!.isUser
        ? `FERGIE TIME! ${last.scorerName} ${formatMinute(last.minute)} snatches it`
        : `Late drama: ${last.scorerName} ${formatMinute(last.minute)} wins it for ${winner!.short}`;
    }
    if (winner && margin >= 4) return `${winner.name} demolish ${loser!.name} ${Math.max(r.homeGoals, r.awayGoals)}-${Math.min(r.homeGoals, r.awayGoals)}`;
    if (winner && loser && !winner.isUser && loser.isUser) return `Shock! ${winner.name} stun ${loser.name}`;
    if (winner && loser && winner.attack + 4 < loser.attack) return `Upset: ${winner.name} topple ${loser.name}`;
    if (!winner && r.homeGoals >= 3) return `${r.homeGoals}-${r.awayGoals} thriller ends all square`;
    if (!winner && r.homeGoals === 0) return 'Stalemate: a goalless grind';
    if (winner && margin === 1) return `${winner.name} edge it`;
    if (winner) return `${winner.name} cruise past ${loser!.name}`;
    return 'Honours even';
  }

  private apply(r: MatchResult) {
    const h = this.table[r.homeId];
    const a = this.table[r.awayId];
    h.played++;
    a.played++;
    h.gf += r.homeGoals;
    h.ga += r.awayGoals;
    a.gf += r.awayGoals;
    a.ga += r.homeGoals;
    const push = (row: TableRow, res: 'W' | 'D' | 'L') => {
      row.form = [...row.form, res].slice(-5);
      if (res === 'W') {
        row.won++;
        row.points += 3;
      } else if (res === 'D') {
        row.drawn++;
        row.points += 1;
      } else row.lost++;
    };
    if (r.homeGoals > r.awayGoals) {
      push(h, 'W');
      push(a, 'L');
    } else if (r.homeGoals < r.awayGoals) {
      push(h, 'L');
      push(a, 'W');
    } else {
      push(h, 'D');
      push(a, 'D');
    }
    // player stats
    const perPlayer = new Map<string, { g: number; a: number }>();
    r.goals.forEach((g) => {
      this.stats[g.scorerId].goals++;
      const pg = perPlayer.get(g.scorerId) ?? { g: 0, a: 0 };
      pg.g++;
      perPlayer.set(g.scorerId, pg);
      if (g.assistId) {
        this.stats[g.assistId].assists++;
        const pa = perPlayer.get(g.assistId) ?? { g: 0, a: 0 };
        pa.a++;
        perPlayer.set(g.assistId, pa);
      }
    });
    for (const [teamId, conceded, scored] of [
      [r.homeId, r.awayGoals, r.homeGoals],
      [r.awayId, r.homeGoals, r.awayGoals],
    ] as [string, number, number][]) {
      const team = this.teamById[teamId];
      const res = scored > conceded ? 0.6 : scored < conceded ? -0.5 : 0;
      team.players.forEach((p) => {
        const st = this.stats[p.id];
        st.apps++;
        const pp = perPlayer.get(p.id);
        const defensive = p.pos === 'GK' || positionGroup(p.pos) === 'DEF';
        let rating = 6.5 + res + (this.rng() - 0.5) * 1.1;
        if (pp) rating += pp.g * 1.0 + pp.a * 0.6;
        if (conceded === 0 && defensive) rating += 0.6;
        if (defensive) rating -= conceded * 0.15;
        st.ratingSum += Math.max(4, Math.min(10, rating));
      });
      if (conceded === 0) {
        const gk = team.players.find((p) => p.pos === 'GK');
        if (gk) this.stats[gk.id].cleanSheets++;
      }
    }
  }

  playMatchweek(shout?: TacticalShout): MatchResult[] {
    if (this.done) return [];
    const mw = this.matchweek + 1;
    const round = this.fixtures[this.matchweek];
    const results = round.map(([h, a]) => this.playMatch(mw, h, a, h === USER_TEAM_ID || a === USER_TEAM_ID ? shout : undefined));
    results.forEach((r) => this.apply(r));
    // user's match first
    results.sort((x, y) => Number(y.involvesUser) - Number(x.involvesUser));
    this.results.push(results);
    this.matchweek = mw;
    if (shout) {
      const ur = results[0];
      const userHome = ur.homeId === USER_TEAM_ID;
      const us = userHome ? ur.homeGoals : ur.awayGoals;
      const them = userHome ? ur.awayGoals : ur.homeGoals;
      this.shouts.push({ mw, shout, result: us > them ? 'W' : us < them ? 'L' : 'D' });
    }
    return results;
  }

  leaders(kind: 'goals' | 'assists' | 'cleanSheets', n = 10): PlayerSeasonStats[] {
    return Object.values(this.stats)
      .filter((s) => s[kind] > 0)
      .sort((a, b) => b[kind] - a[kind] || (kind === 'goals' ? b.assists - a.assists : b.goals - a.goals) || Number(b.isUser) - Number(a.isUser))
      .slice(0, n);
  }

  userResult(mwIdx: number): MatchResult | undefined {
    return this.results[mwIdx]?.find((r) => r.involvesUser);
  }
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ───────────────────────────── grading & review ─────────────────────────────

export function gradeFor(position: number, row: TableRow): Grade {
  if (position === 1 && row.lost === 0) return 'S+';
  if (position === 1 && row.points >= 90) return 'S';
  if (position <= 3) return 'A';
  if (position <= 5) return 'B';
  if (position <= 10) return 'C';
  if (position <= 17) return 'D';
  return 'F';
}

/** Title and subtitle for the review card. A league title under 90 pts is grade A, but it's still a title. */
export function gradeLabel(grade: Grade, position: number) {
  if (grade === 'A' && position === 1) return { title: 'CHAMPIONS', subtitle: 'Premier League Champions' };
  return GRADE_INFO[grade];
}

export const GRADE_INFO: Record<Grade, { title: string; subtitle: string }> = {
  'S+': { title: 'INVINCIBLE', subtitle: 'Unbeaten Champions' },
  S: { title: 'CHAMPIONS', subtitle: 'Premier League Champions · 90+ pts' },
  A: { title: 'TITLE CONTENDERS', subtitle: 'Champions League Qualification' },
  B: { title: 'EUROPEAN PUSH', subtitle: 'Top 4 / Top 5 Finish' },
  C: { title: 'MID-TABLE', subtitle: 'Solid Respectability' },
  D: { title: 'UNDERACHIEVERS', subtitle: 'Bottom-Half Finish' },
  F: { title: 'RELEGATED', subtitle: 'Sacked in the Morning' },
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function buildSummary(sim: SeasonSim, formationId: FormationId, lineup: Lineup, rating: TeamRating): SeasonSummary {
  const rng = sim.rng;
  const table = sim.sortedTable();
  const position = sim.userPosition();
  const record = table[position - 1];
  const grade = gradeFor(position, record);
  const formation = FORMATIONS[formationId];
  const userStats = Object.values(sim.stats).filter((s) => s.isUser);
  const cardById: Record<string, PlayerCard> = {};
  Object.values(lineup).forEach((c) => c && (cardById[c.id] = c));

  const mvp =
    [...userStats].sort(
      (a, b) =>
        b.ratingSum / Math.max(1, b.apps) + b.goals * 0.06 + b.assists * 0.04 + b.cleanSheets * 0.03 -
        (a.ratingSum / Math.max(1, a.apps) + a.goals * 0.06 + a.assists * 0.04 + a.cleanSheets * 0.03),
    )[0] ?? null;
  const goldenBoot = sim.leaders('goals', 1)[0] ?? null;
  const goldenGlove = sim.leaders('cleanSheets', 1)[0] ?? null;
  const playmaker = sim.leaders('assists', 1)[0] ?? null;

  // biggest win / worst loss
  let biggestWin: MatchResult | null = null;
  let worstLoss: MatchResult | null = null;
  let bestMargin = 0;
  let worstMargin = 0;
  let streak = 0;
  let bestStreak = 0;
  let unbeatenRun = 0;
  let bestUnbeaten = 0;
  sim.results.forEach((_, i) => {
    const r = sim.userResult(i)!;
    const home = r.homeId === USER_TEAM_ID;
    const diff = home ? r.homeGoals - r.awayGoals : r.awayGoals - r.homeGoals;
    if (diff > bestMargin) {
      bestMargin = diff;
      biggestWin = r;
    }
    if (diff < worstMargin) {
      worstMargin = diff;
      worstLoss = r;
    }
    streak = diff > 0 ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
    unbeatenRun = diff >= 0 ? unbeatenRun + 1 : 0;
    bestUnbeaten = Math.max(bestUnbeaten, unbeatenRun);
  });

  const topUser = [...userStats].sort((a, b) => b.goals - a.goals)[0];
  const topCreator = [...userStats].sort((a, b) => b.assists - a.assists)[0];
  const gkSlot = formation.slots.find((sl) => sl.label === 'GK');
  const gkCard = gkSlot ? lineup[gkSlot.id] : null;
  const userGk = (gkCard && userStats.find((s) => s.id === gkCard.id)) ?? userStats.find((s) => s.cleanSheets > 0);

  const highlights: string[] = [];
  highlights.push(`${record.won}W ${record.drawn}D ${record.lost}L · ${record.gf} scored, ${record.ga} conceded`);
  if (record.lost === 0 && record.drawn === 0) highlights.push('PERFECT SEASON: 38 wins from 38. Statistically absurd.');
  else if (record.lost === 0) highlights.push('Went the entire season unbeaten.');
  if (bestStreak >= 5) highlights.push(`${bestStreak}-match winning streak`);
  if (bestUnbeaten >= 10 && record.lost > 0) highlights.push(`${bestUnbeaten}-game unbeaten run`);
  if (topUser && topUser.goals > 0) highlights.push(`${topUser.name} bagged ${topUser.goals} league goals`);
  if (topCreator && topCreator.assists > 0) highlights.push(`${topCreator.name} laid on ${topCreator.assists} assists`);
  if (userGk && userGk.cleanSheets > 0) highlights.push(`${userGk.name} kept ${userGk.cleanSheets} clean sheets`);
  if (biggestWin) {
    const b = biggestWin as MatchResult;
    const opp = sim.teamById[b.homeId === USER_TEAM_ID ? b.awayId : b.homeId];
    highlights.push(`Biggest win: ${Math.max(b.homeGoals, b.awayGoals)}-${Math.min(b.homeGoals, b.awayGoals)} vs ${opp.name}`);
  }
  sim.shouts.forEach((s) => {
    const label = s.shout === 'attack' ? 'All-Out Attack' : s.shout === 'bus' ? 'Park the Bus' : 'Stick to Gameplan';
    highlights.push(`MW${s.mw} touchline call (${label}): ${s.result === 'W' ? 'won it' : s.result === 'D' ? 'drew' : 'lost'}`);
  });

  // Tactical rating 1–10
  const shoutScore = sim.shouts.reduce((s, x) => s + (x.result === 'W' ? 1 : x.result === 'D' ? 0.3 : -0.8), 0);
  const tacticalRating = Math.max(
    1,
    Math.min(10, Math.round((4 + rating.chemistry / 25 + (rating.managerActive ? 1.2 : 0) - rating.oopPenalty * 0.6 - rating.balancePenalty + shoutScore) * 10) / 10),
  );

  // Scout's verdict
  const placed = formation.slots.map((s) => ({ slot: s, card: lineup[s.id] })).filter((x) => x.card) as { slot: (typeof formation.slots)[number]; card: PlayerCard }[];
  const stars = [...placed].sort((a, b) => {
    const sa = sim.stats[a.card.id];
    const sb = sim.stats[b.card.id];
    return sb.goals + sb.assists * 0.7 - (sa.goals + sa.assists * 0.7);
  });
  const label = (c: PlayerCard) => `${c.season} ${c.era === 'PRIME' ? 'Prime ' : c.era === 'LEGEND' ? 'Legend ' : ''}${c.shortName}`;
  const s1 = stars[0]?.card;
  const s2 = stars[1]?.card;
  const worstFit = rating.fits.filter((f) => f.fit === 'oop' || f.fit === 'adjacent').sort((a, b) => b.penalty - a.penalty)[0];
  const misfit = worstFit ? placed.find((p) => p.slot.id === worstFit.slotId) : undefined;
  const roleName = (pos: string) =>
    ({ GK: 'goalkeeper', CB: 'centre-back', RB: 'right-back', LB: 'left-back', CDM: 'holding midfielder', CM: 'central midfielder', CAM: 'No.10', RM: 'right midfielder', LM: 'left midfielder', RW: 'right winger', LW: 'left winger', ST: 'striker' })[pos] ?? pos;

  const opening =
    grade === 'S+' || grade === 'S'
      ? `Pairing ${s1 ? label(s1) : 'your stars'} with ${s2 ? label(s2) : 'that supporting cast'} tore the league apart`
      : grade === 'A' && position === 1
        ? `${s1 ? label(s1) : 'Your talisman'} and ${s2 ? label(s2) : 'friends'} dragged this side over the line`
        : grade === 'A' || grade === 'B'
          ? `${s1 ? label(s1) : 'Your talisman'} and ${s2 ? label(s2) : 'friends'} kept you in the hunt all season`
        : grade === 'C' || grade === 'D'
          ? `${s1 ? label(s1) : 'Your best player'} carried the load, but too often looked lonely`
          : `Not even ${s1 ? label(s1) : 'your marquee signing'} could save this sinking ship`;
  const twist = misfit
    ? `, though playing a ${roleName(misfit.card.positions[0])} at ${roleName(misfit.slot.label)} gave ${misfit.slot.label === 'GK' ? 'everyone' : positionGroup(misfit.slot.label) === 'DEF' ? 'your defence' : 'the coaching staff'} heart palpitations.`
    : rating.balanceNote && rating.balancePenalty > 0
      ? ', though a midfield with no shield left the back four horribly exposed.'
      : rating.chemistry >= 70
        ? `, and ${rating.chemistry}% chemistry made it look rehearsed.`
        : '.';
  const closers: Record<Grade, string[]> = {
    'S+': ['History will remember this XI alongside the 03-04 Arsenal side. Frame the shirt.', 'Unbeaten. Unmatched. Pundits have run out of superlatives.'],
    S: ['A title won at a canter. The parade bus has been booked.', 'Champions with room to spare. The rest of the league is writing apology letters.'],
    A: ['So close to glory that the board are already sanctioning a summer splurge.', 'Champions League nights are coming. Now go and win the thing.'],
    B: ['Europe beckons, but the title chasers barely looked over their shoulders.', 'A strong campaign, if one big summer signing short of contention.'],
    C: ['Comfortable, forgettable, and safely in the middle of the pack.', 'The kind of season that sells very few calendars.'],
    D: ['The fans have started singing about the board. Not kindly.', 'A big-name XI that played like a pub team on a Sunday morning.'],
    F: ['Sacked in the morning. The fans have already chartered a plane with a banner.', 'Relegated with this squad? Pundits will be dissecting this one for years.'],
  };
  const champClosers = ['Champions, if not by the landslide the squad promised. The trophy looks the same either way.', 'A title is a title. The parade bus does not check the points total.'];
  const verdict = `${opening}${twist} ${pick(grade === 'A' && position === 1 ? champClosers : closers[grade], rng)}`;

  return {
    grade,
    position,
    record,
    mvp,
    mvpCard: mvp ? cardById[mvp.id] ?? null : null,
    goldenBoot,
    goldenGlove,
    playmaker,
    userWonBoot: !!goldenBoot?.isUser,
    userWonGlove: !!goldenGlove?.isUser,
    userWonPlaymaker: !!playmaker?.isUser,
    highlights: highlights.slice(0, 8),
    verdict,
    tacticalRating,
    biggestWin,
    worstLoss,
  };
}
