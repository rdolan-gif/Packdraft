import { MANAGERS } from '../data/managers';
import { PLAYERS } from '../data/players';
import { DUOS, loadDuos } from '../data/duos';
import { loadBook } from './stickerBook';
import { loadCareer } from './vault';
import { dailyStreak, loadDaily } from './daily';
import type { CareerStats, FormationId, Grade, ManagerId, PlayerCard, TableRow } from '../types/game';
import type { LeagueEraId } from './seasonSimulator';

// Trophies: one-off achievements, kept in this browser. Season trophies are checked when a season ends;
// collection, duo and daily ones whenever something changes.

export type TrophyCategory = 'season' | 'squad' | 'managers' | 'collection' | 'duos' | 'daily';
export const CATEGORY_INFO: Record<TrophyCategory, { title: string; blurb: string }> = {
  season: { title: 'Season Honours', blurb: 'What your side did over 38 games.' },
  squad: { title: 'Squad Challenges', blurb: 'Win in style: build the XI a certain way.' },
  managers: { title: 'Manager Mastery', blurb: 'Win the league with every manager.' },
  collection: { title: 'Sticker Collection', blurb: 'Fill the album.' },
  duos: { title: 'Famous Duos', blurb: 'Some players were made for each other. Find out who.' },
  daily: { title: 'Daily Draft', blurb: 'One shot a day, same packs for everyone.' },
};

/** What a finished season looked like. */
export interface SeasonFacts {
  position: number;
  record: TableRow;
  grade: Grade;
  wonBoot: boolean;
  wonGlove: boolean;
  wonPlaymaker: boolean;
  cards: PlayerCard[];
  formationId: FormationId;
  managerId: ManagerId;
  teamRating: number;
  chemistry: number;
  eraId: LeagueEraId;
  daily: boolean;
  /** League position at the halfway point (after matchweek 19). */
  midPosition: number;
}

/** Long-running progress, read from storage. */
export interface Progress {
  career: CareerStats;
  stickers: number;
  stickerTotal: number;
  clubsComplete: number;
  secretFound: boolean;
  duos: number;
  duoTotal: number;
  managerTitles: Partial<Record<ManagerId, number>>;
  erasWon: Partial<Record<LeagueEraId, number>>;
  dailyDone: number;
  dailyStreak: number;
  bestDailyStreak: number;
}

export interface Trophy {
  id: string;
  category: TrophyCategory;
  emoji: string;
  title: string;
  desc: string;
  /** Hidden until unlocked. */
  secret?: boolean;
  test: (p: Progress, s?: SeasonFacts) => boolean;
  /** [current, target] for a progress bar. */
  progress?: (p: Progress) => [number, number];
}

const seasonStart = (season: string) => {
  const yy = parseInt(season.slice(0, 2), 10);
  return yy >= 90 ? 1900 + yy : 2000 + yy;
};
const won = (s?: SeasonFacts) => !!s && s.position === 1;
const top4 = (s?: SeasonFacts) => !!s && s.position <= 4;
const maxFromOneClub = (cards: PlayerCard[]) => {
  const n: Record<string, number> = {};
  cards.forEach((c) => (n[c.club] = (n[c.club] ?? 0) + 1));
  return Math.max(0, ...Object.values(n));
};

export const ALBUM_CARDS = PLAYERS.filter((p) => p.tier !== 'SECRET_DEV');

export const TROPHIES: Trophy[] = [
  // ── season
  { id: 'first_whistle', category: 'season', emoji: '🟢', title: 'First Whistle', desc: 'Finish your first season.', test: (p) => p.career.runs >= 1 },
  { id: 'champions', category: 'season', emoji: '🏆', title: 'Champions', desc: 'Win the league.', test: (_, s) => won(s) },
  { id: 'serial_winners', category: 'season', emoji: '🔁', title: 'Serial Winners', desc: 'Win 5 league titles.', test: (p) => p.career.titles >= 5, progress: (p) => [p.career.titles, 5] },
  { id: 'centurion', category: 'season', emoji: '💯', title: 'Centurion', desc: 'Finish a season on 100+ points.', test: (_, s) => !!s && s.record.points >= 100 },
  { id: 'invincible', category: 'season', emoji: '🛡️', title: 'Invincible', desc: 'Go a whole season unbeaten.', test: (_, s) => !!s && s.record.lost === 0 },
  { id: 'perfect', category: 'season', emoji: '👑', title: '38-0', desc: 'Win all 38 games. The holy grail.', test: (_, s) => !!s && s.record.won === 38 },
  { id: 'golden_boot', category: 'season', emoji: '🥾', title: 'Golden Boot', desc: "One of your players is the league's top scorer.", test: (_, s) => !!s?.wonBoot },
  { id: 'golden_glove', category: 'season', emoji: '🧤', title: 'Golden Glove', desc: 'Your keeper keeps the most clean sheets.', test: (_, s) => !!s?.wonGlove },
  { id: 'playmaker', category: 'season', emoji: '🎯', title: 'Playmaker', desc: 'One of your players tops the assists chart.', test: (_, s) => !!s?.wonPlaymaker },
  { id: 'clean_sweep', category: 'season', emoji: '🌟', title: 'Clean Sweep', desc: 'Win the Golden Boot, Golden Glove and Playmaker in one season.', test: (_, s) => !!s && s.wonBoot && s.wonGlove && s.wonPlaymaker },
  { id: 'goal_rush', category: 'season', emoji: '⚽', title: 'Goal Rush', desc: 'Score 100+ league goals.', test: (_, s) => !!s && s.record.gf >= 100 },
  { id: 'brick_wall', category: 'season', emoji: '🧱', title: 'Brick Wall', desc: 'Concede 15 or fewer league goals.', test: (_, s) => !!s && s.record.ga <= 15 },
  { id: 'comeback', category: 'season', emoji: '📈', title: 'Comeback Kings', desc: '10th or lower at the halfway point, top four at the end.', test: (_, s) => !!s && s.midPosition >= 10 && s.position <= 4 },
  { id: 'wooden_spoon', category: 'season', emoji: '🥄', title: 'Wooden Spoon', desc: 'Finish rock bottom. It happens to the best of us.', secret: true, test: (_, s) => !!s && s.position === 20 },

  // ── squad challenges
  { id: 'one_club', category: 'squad', emoji: '🏟️', title: 'One-Club Wonder', desc: 'Win the league with 6+ players from the same club.', test: (_, s) => won(s) && maxFromOneClub(s!.cards) >= 6 },
  { id: 'old_school', category: 'squad', emoji: '📼', title: 'Old School', desc: 'Win the league with every player from 2004-05 or earlier.', test: (_, s) => won(s) && s!.cards.every((c) => seasonStart(c.season) <= 2004) },
  { id: 'new_wave', category: 'squad', emoji: '📱', title: 'New Wave', desc: 'Win the league with every player from 2015-16 or later.', test: (_, s) => won(s) && s!.cards.every((c) => seasonStart(c.season) >= 2015) },
  { id: 'two_banks', category: 'squad', emoji: '✌️', title: 'Two Banks of Four', desc: 'Go unbeaten playing 4-4-2.', test: (_, s) => !!s && s.record.lost === 0 && s.formationId === '4-4-2' },
  { id: 'no_stars', category: 'squad', emoji: '🔧', title: 'No Superstars', desc: 'Win the league without a Gold, Prime Icon or secret card.', test: (_, s) => won(s) && s!.cards.every((c) => c.tier === 'STANDARD' || c.tier === 'ELITE') },
  { id: 'giant_killers', category: 'squad', emoji: '🪓', title: 'Giant Killers', desc: 'Win the league with a team rating under 84.', test: (_, s) => won(s) && s!.teamRating < 84 },
  { id: 'three_lions', category: 'squad', emoji: '🦁', title: 'Three Lions', desc: 'Finish top four with an all-English XI.', test: (_, s) => top4(s) && s!.cards.every((c) => c.nation === 'England') },
  { id: 'world_xi', category: 'squad', emoji: '🌍', title: 'World XI', desc: 'Finish top four with players from 9+ different nations.', test: (_, s) => top4(s) && new Set(s!.cards.map((c) => c.nation)).size >= 9 },
  { id: 'harmony', category: 'squad', emoji: '🎼', title: 'Perfect Harmony', desc: 'Play a season with 90+ chemistry.', test: (_, s) => !!s && s.chemistry >= 90 },
  {
    id: 'all_eras', category: 'squad', emoji: '🕰️', title: 'Across the Ages', desc: 'Win the league in all four league eras.',
    test: (p) => Object.keys(p.erasWon).length >= 4, progress: (p) => [Object.keys(p.erasWon).length, 4],
  },

  // ── managers: one per manager, plus the full set
  ...MANAGERS.map<Trophy>((m) => ({
    id: `mgr_${m.id}`, category: 'managers', emoji: m.emoji, title: m.name, desc: `Win the league with ${m.name}.`,
    test: (p) => (p.managerTitles[m.id] ?? 0) > 0,
  })),
  {
    id: 'full_dugout', category: 'managers', emoji: '🎩', title: 'Full Dugout', desc: 'Win the league with all 12 managers.',
    test: (p) => MANAGERS.every((m) => (p.managerTitles[m.id] ?? 0) > 0),
    progress: (p) => [MANAGERS.filter((m) => (p.managerTitles[m.id] ?? 0) > 0).length, MANAGERS.length],
  },

  // ── collection
  ...[100, 250, 500].map<Trophy>((n, i) => ({
    id: `stickers_${n}`, category: 'collection', emoji: ['📗', '📘', '📙'][i], title: ['Got, Got, Need', 'Swapsies', 'Album Addict'][i], desc: `Collect ${n} stickers.`,
    test: (p) => p.stickers >= n, progress: (p) => [Math.min(p.stickers, n), n],
  })),
  { id: 'stickers_all', category: 'collection', emoji: '📕', title: 'Complete Album', desc: 'Collect every sticker in the album.', test: (p) => p.stickers >= p.stickerTotal, progress: (p) => [p.stickers, p.stickerTotal] },
  { id: 'club_complete', category: 'collection', emoji: '🧩', title: 'Full Set', desc: "Complete a club's pages in the album.", test: (p) => p.clubsComplete >= 1 },
  { id: 'secret_rare', category: 'collection', emoji: '🌈', title: 'Classified', desc: 'Find a secret rare.', secret: true, test: (p) => p.secretFound },

  // ── duos
  { id: 'duo_1', category: 'duos', emoji: '🤝', title: 'Dynamic Duo', desc: 'Discover a famous duo.', test: (p) => p.duos >= 1 },
  { id: 'duo_5', category: 'duos', emoji: '👯', title: 'Partners in Crime', desc: 'Discover 5 famous duos.', test: (p) => p.duos >= 5, progress: (p) => [Math.min(p.duos, 5), 5] },
  { id: 'duo_15', category: 'duos', emoji: '💞', title: 'Matchmaker', desc: 'Discover 15 famous duos.', test: (p) => p.duos >= 15, progress: (p) => [Math.min(p.duos, 15), 15] },
  { id: 'duo_all', category: 'duos', emoji: '💘', title: 'Duo Hunter', desc: 'Discover every famous duo.', test: (p) => p.duos >= p.duoTotal, progress: (p) => [p.duos, p.duoTotal] },

  // ── daily
  { id: 'daily_1', category: 'daily', emoji: '📅', title: 'Daily Driver', desc: 'Finish a Daily Draft.', test: (p) => p.dailyDone >= 1 },
  { id: 'daily_3', category: 'daily', emoji: '🔥', title: 'Hat-Trick', desc: 'Finish the Daily Draft 3 days in a row.', test: (p) => p.bestDailyStreak >= 3, progress: (p) => [Math.min(p.dailyStreak, 3), 3] },
  { id: 'daily_7', category: 'daily', emoji: '🗓️', title: 'Week in Week Out', desc: 'Finish the Daily Draft 7 days in a row.', test: (p) => p.bestDailyStreak >= 7, progress: (p) => [Math.min(p.dailyStreak, 7), 7] },
  { id: 'daily_30', category: 'daily', emoji: '🏅', title: 'Season Ticket', desc: 'Finish the Daily Draft 30 days in a row.', test: (p) => p.bestDailyStreak >= 30, progress: (p) => [Math.min(p.dailyStreak, 30), 30] },
  { id: 'daily_champ', category: 'daily', emoji: '🥇', title: 'Champion of the Day', desc: 'Win the league in a Daily Draft.', test: (_, s) => !!s && s.daily && s.position === 1 },
];

// ───────────────────────────── storage ─────────────────────────────

const KEY = 'pd38_trophies_v1';
interface Store {
  unlocked: Record<string, string>; // trophy id -> date
  managerTitles: Partial<Record<ManagerId, number>>;
  erasWon: Partial<Record<LeagueEraId, number>>;
  bestDailyStreak: number;
}

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
    return { unlocked: s.unlocked ?? {}, managerTitles: s.managerTitles ?? {}, erasWon: s.erasWon ?? {}, bestDailyStreak: s.bestDailyStreak ?? 0 };
  } catch {
    return { unlocked: {}, managerTitles: {}, erasWon: {}, bestDailyStreak: 0 };
  }
}
function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export const unlockedTrophies = () => load().unlocked;

export function readProgress(store = load()): Progress {
  const book = loadBook();
  const stickers = ALBUM_CARDS.filter((c) => book.pulled[c.id]).length;
  const byClub: Record<string, { have: number; total: number }> = {};
  ALBUM_CARDS.forEach((c) => {
    const e = (byClub[c.club] ??= { have: 0, total: 0 });
    e.total++;
    if (book.pulled[c.id]) e.have++;
  });
  const daily = loadDaily();
  const streak = dailyStreak(daily);
  return {
    career: loadCareer(),
    stickers,
    stickerTotal: ALBUM_CARDS.length,
    clubsComplete: Object.values(byClub).filter((c) => c.have === c.total).length,
    secretFound: PLAYERS.some((c) => c.tier === 'SECRET_DEV' && book.pulled[c.id]),
    duos: Object.keys(loadDuos()).length,
    duoTotal: DUOS.length,
    managerTitles: store.managerTitles,
    erasWon: store.erasWon,
    dailyDone: Object.values(daily).filter((d) => d.status === 'done').length,
    dailyStreak: streak,
    bestDailyStreak: Math.max(store.bestDailyStreak, streak),
  };
}

/** Check every trophy (with a finished season, if given). Returns the ones unlocked just now. */
export function checkTrophies(season?: SeasonFacts): Trophy[] {
  const store = load();
  if (season && season.position === 1) {
    store.managerTitles[season.managerId] = (store.managerTitles[season.managerId] ?? 0) + 1;
    store.erasWon[season.eraId] = (store.erasWon[season.eraId] ?? 0) + 1;
  }
  const p = readProgress(store);
  store.bestDailyStreak = p.bestDailyStreak;
  const fresh = TROPHIES.filter((t) => !store.unlocked[t.id] && t.test(p, season));
  const now = new Date().toISOString();
  fresh.forEach((t) => (store.unlocked[t.id] = now));
  save(store);
  return fresh;
}
