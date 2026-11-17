import { FORMATIONS } from '../data/formations';
import { PLAYERS_BY_ID } from '../data/players';
import { fitFor } from './chemistry';
import type { FormationId, Grade, Lineup, ManagerId, PlayerCard, Position } from '../types/game';

// Every finished season, kept in this browser: powers personal records and the Best Ever XI.
// (The Trophy Vault only keeps title winners; this keeps them all, up to MAX_RUNS.)

export interface RunPlayer {
  cardId: string;
  /** The position they played (pitch slot label). */
  slot: Position;
  goals: number;
  assists: number;
  cleanSheets: number;
  apps: number;
  /** Average match rating. */
  avg: number;
}

export interface RunRecord {
  id: string;
  date: string;
  teamName: string;
  daily: boolean;
  eraName: string;
  managerId: ManagerId;
  formationId: FormationId;
  position: number;
  grade: Grade;
  points: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  rating: number;
  players: RunPlayer[];
}

const KEY = 'pd38_history_v1';
const MAX_RUNS = 300;

export function loadHistory(): RunRecord[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function recordHistory(run: RunRecord): RunRecord[] {
  const all = [run, ...loadHistory()].slice(0, MAX_RUNS);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
  return all;
}

// ───────────────────────────── personal records ─────────────────────────────

export interface PersonalRecord {
  id: string;
  emoji: string;
  label: string;
  value: string;
  /** Who/when, e.g. "PackDraft XI · 12 Nov". */
  detail: string;
  cardId?: string;
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const gdText = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

export function personalRecords(history = loadHistory()): PersonalRecord[] {
  if (!history.length) return [];
  const out: PersonalRecord[] = [];
  const best = <T,>(items: T[], score: (t: T) => number) => items.reduce((a, b) => (score(b) > score(a) ? b : a));
  const team = (r: RunRecord) => `${r.teamName} · ${ordinalOf(r.position)} · ${day(r.date)}`;

  const pts = best(history, (r) => r.points);
  out.push({ id: 'points', emoji: '💯', label: 'Most points', value: `${pts.points} pts`, detail: team(pts) });
  const gd = best(history, (r) => r.gf - r.ga);
  out.push({ id: 'gd', emoji: '➕', label: 'Best goal difference', value: gdText(gd.gf - gd.ga), detail: team(gd) });
  const gf = best(history, (r) => r.gf);
  out.push({ id: 'gf', emoji: '⚽', label: 'Most goals scored', value: `${gf.gf}`, detail: team(gf) });
  const ga = best(history, (r) => -r.ga);
  out.push({ id: 'ga', emoji: '🧱', label: 'Fewest conceded', value: `${ga.ga}`, detail: team(ga) });
  const wins = best(history, (r) => r.w);
  out.push({ id: 'wins', emoji: '✅', label: 'Most wins', value: `${wins.w}`, detail: team(wins) });

  const seasons = history.flatMap((r) => r.players.map((p) => ({ r, p })));
  if (seasons.length) {
    const label = (x: { r: RunRecord; p: RunPlayer }) => {
      const c = PLAYERS_BY_ID[x.p.cardId];
      return c ? `${c.season} ${c.shortName}` : 'Unknown';
    };
    const scorer = best(seasons, (x) => x.p.goals);
    if (scorer.p.goals > 0) out.push({ id: 'scorer', emoji: '🥾', label: 'Top scorer ever', value: `${scorer.p.goals} goals`, detail: `${label(scorer)} · ${scorer.r.teamName}`, cardId: scorer.p.cardId });
    const creator = best(seasons, (x) => x.p.assists);
    if (creator.p.assists > 0) out.push({ id: 'assists', emoji: '🎯', label: 'Most assists in a season', value: `${creator.p.assists}`, detail: `${label(creator)} · ${creator.r.teamName}`, cardId: creator.p.cardId });
    const keeper = best(seasons, (x) => x.p.cleanSheets * (x.p.slot === 'GK' ? 1 : 0));
    if (keeper.p.cleanSheets > 0 && keeper.p.slot === 'GK')
      out.push({ id: 'cs', emoji: '🧤', label: 'Most clean sheets', value: `${keeper.p.cleanSheets}`, detail: `${label(keeper)} · ${keeper.r.teamName}`, cardId: keeper.p.cardId });
    const regulars = seasons.filter((x) => x.p.apps >= 15);
    if (regulars.length) {
      const star = best(regulars, (x) => x.p.avg);
      out.push({ id: 'rating', emoji: '⭐', label: 'Best season rating', value: star.p.avg.toFixed(2), detail: `${label(star)} · ${star.r.teamName}`, cardId: star.p.cardId });
    }
  }
  return out;
}

function ordinalOf(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ───────────────────────────── Best Ever XI ─────────────────────────────

export interface BestXiPick {
  slotId: string;
  card: PlayerCard;
  stats: RunPlayer;
  teamName: string;
}

/** Score for a single season by a player: match rating first, with credit for goals, assists and clean sheets. */
const seasonScore = (p: RunPlayer) => p.avg + p.goals * 0.02 + p.assists * 0.015 + (p.slot === 'GK' || p.slot === 'CB' ? p.cleanSheets * 0.01 : 0);

/** The best players you've ever drafted, one season each, in a 4-3-3 (each player once). */
export function bestEverXI(history = loadHistory(), formationId: FormationId = '4-3-3'): { lineup: Lineup; picks: BestXiPick[] } {
  const slots = FORMATIONS[formationId].slots;
  const candidates = history
    .flatMap((r) => r.players.filter((p) => p.apps >= 10).map((p) => ({ p, r, card: PLAYERS_BY_ID[p.cardId] })))
    .filter((x) => x.card)
    .sort((a, b) => seasonScore(b.p) - seasonScore(a.p));
  const lineup: Lineup = Object.fromEntries(slots.map((s) => [s.id, null]));
  const picks: BestXiPick[] = [];
  const usedBase = new Set<string>();
  // First pass: natural fits only. Second pass: allow close fits so the XI fills up.
  for (const maxPenalty of [1, 5, 12]) {
    for (const x of candidates) {
      if (usedBase.has(x.card.basePlayerId)) continue;
      const slot = slots.find((s) => !lineup[s.id] && fitFor(x.card, s.label).penalty <= maxPenalty);
      if (!slot) continue;
      lineup[slot.id] = x.card;
      usedBase.add(x.card.basePlayerId);
      picks.push({ slotId: slot.id, card: x.card, stats: x.p, teamName: x.r.teamName });
    }
  }
  return { lineup, picks };
}
