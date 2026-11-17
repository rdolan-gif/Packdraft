import type { Grade, MatchResult } from '../types/game';

// The Daily Draft: everyone gets the same managers, league era, packs and season luck on the same day.
// Every random number comes from a seed made of the date, so no server is needed. One attempt a day.

/** The first Daily Draft. Day numbers count from here (#1). */
const LAUNCH = Date.UTC(2026, 10, 17);

/** Today's date on this device, as YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayNumber(key = todayKey()): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - LAUNCH) / 86400000) + 1;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small fast seeded random number generator (mulberry32). */
export function seededRng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random stream for one part of today's draft, e.g. dailyRng(day, 'pack3'). */
export const dailyRng = (day: string, part: string) => seededRng(`pd38-daily:${day}:${part}`);

// ───────────────────────────── results ─────────────────────────────

export interface DailyResult {
  day: string;
  number: number;
  status: 'started' | 'done';
  grade?: Grade;
  position?: number;
  points?: number;
  record?: { w: number; d: number; l: number; gf: number; ga: number };
  /** W/D/L for each of the 38 matches, in order. */
  form?: string;
  rating?: number;
  chemistry?: number;
  teamName?: string;
  managerName?: string;
  eraName?: string;
}

const KEY = 'pd38_daily_v1';

export function loadDaily(): Record<string, DailyResult> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function saveDaily(all: Record<string, DailyResult>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

/** Starting the draft uses today's attempt (abandoning it doesn't give you another). */
export function markDailyStarted(day: string) {
  const all = loadDaily();
  if (!all[day]) {
    all[day] = { day, number: dayNumber(day), status: 'started' };
    saveDaily(all);
  }
}

export function saveDailyResult(r: DailyResult) {
  const all = loadDaily();
  all[r.day] = r;
  saveDaily(all);
}

/** Consecutive days with a finished Daily Draft, ending today (or yesterday, if today isn't done yet). */
export function dailyStreak(all = loadDaily(), today = todayKey()): number {
  const d = new Date(`${today}T12:00:00`);
  if (all[today]?.status !== 'done') d.setDate(d.getDate() - 1);
  let n = 0;
  while (all[todayKey(d)]?.status === 'done') {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function formFromResults(results: MatchResult[], userId: string): string {
  return results
    .map((r) => {
      const diff = r.homeId === userId ? r.homeGoals - r.awayGoals : r.awayGoals - r.homeGoals;
      return diff > 0 ? 'W' : diff < 0 ? 'L' : 'D';
    })
    .join('');
}

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** The text people paste into a group chat: no spoilers about which players, just how it went. */
export function dailyShareText(r: DailyResult, streak: number): string {
  const sq = (c: string) => (c === 'W' ? '🟩' : c === 'D' ? '🟨' : '🟥');
  const form = r.form ?? '';
  const rows = [form.slice(0, 10), form.slice(10, 20), form.slice(20, 30), form.slice(30)].filter(Boolean).map((row) => [...row].map(sq).join(''));
  const medal = r.position === 1 ? (r.record?.l === 0 ? '👑' : '🏆') : r.position && r.position <= 4 ? '⭐' : r.position && r.position >= 18 ? '⬇️' : '⚽';
  return [
    `PackDraft 38 · Daily #${r.number}`,
    `${medal} ${ord(r.position ?? 0)} · ${r.points} pts · Grade ${r.grade}`,
    `${r.record?.w}W ${r.record?.d}D ${r.record?.l}L · ${r.eraName ?? ''}`,
    ...rows,
    streak > 1 ? `🔥 ${streak}-day streak` : '',
    'https://rdolan-gif.github.io/Packdraft/',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Time until the next Daily Draft, e.g. "7h 12m". */
export function untilTomorrow(now = new Date()): string {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
