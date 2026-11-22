// The sticker book: every card you've ever pulled, saved in this browser.
// - "pulled": the card appeared in a pack you opened (that's what fills the book)
// - "drafted": you picked it into your XI (earns a gold star on the sticker)
// - "totw": Team of the Week honours (a separate bonus page, not part of completion)
// - "spares": album stickers pulled again after you'd already got them ("got got")

import type { PlayerCard } from '../types/game';
import { PLAYERS } from '../data/players';

const KEY = 'pd38_stickers_v1';

export interface StickerBook {
  pulled: Record<string, string>; // card id -> first pulled (ISO date)
  drafted: Record<string, number>; // card id -> times drafted
  totw: Record<string, { count: number; first: string }>; // card id -> Team of the Week honours
  spares: Record<string, number>; // card id -> duplicates pulled
}

const EMPTY: StickerBook = { pulled: {}, drafted: {}, totw: {}, spares: {} };

export function loadBook(): StickerBook {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, pulled: {}, drafted: {}, totw: {}, spares: {} };
    const b = JSON.parse(raw);
    return { pulled: b.pulled ?? {}, drafted: b.drafted ?? {}, totw: b.totw ?? {}, spares: b.spares ?? {} };
  } catch {
    return { pulled: {}, drafted: {}, totw: {}, spares: {} };
  }
}

function save(b: StickerBook) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable: the book lasts for this visit only */
  }
}

/** Stick in every card from an opened pack; album stickers you already had become spares. Returns the new ids. */
export function recordPulled(ids: string[]): string[] {
  const b = loadBook();
  const now = new Date().toISOString();
  const fresh = ids.filter((id) => !b.pulled[id]);
  ids.forEach((id) => {
    if (b.pulled[id] && ALBUM_IDS.has(id)) b.spares[id] = (b.spares[id] ?? 0) + 1;
  });
  fresh.forEach((id) => (b.pulled[id] = now));
  save(b);
  return fresh;
}

export function recordDrafted(id: string) {
  const b = loadBook();
  b.pulled[id] ??= new Date().toISOString();
  b.drafted[id] = (b.drafted[id] ?? 0) + 1;
  save(b);
}

export function recordTotw(ids: string[]) {
  if (!ids.length) return;
  const b = loadBook();
  const now = new Date().toISOString();
  ids.forEach((id) => {
    const cur = b.totw[id];
    b.totw[id] = { count: (cur?.count ?? 0) + 1, first: cur?.first ?? now };
  });
  save(b);
}

export function isPulled(id: string) {
  return !!loadBook().pulled[id];
}

// ───────────────────────────── what goes in the album ─────────────────────────────


/** The album holds rare pulls only: Elite (81+), gold, Prime Icons. Squad cards and secret rares (own pages) stay out. */
export const inAlbum = (c: PlayerCard) => c.tier === 'ELITE' || c.tier === 'RISING_WORLD' || c.tier === 'PRIME_ICON';

export const ALBUM_CARDS = PLAYERS.filter(inAlbum);
const ALBUM_IDS = new Set(ALBUM_CARDS.map((c) => c.id));

export interface AlbumSection {
  id: string;
  title: string;
  blurb: string;
  /** Banner colour and finish. */
  colour: string;
  finish?: 'holo' | 'gold';
}

const DECADES: [string, string][] = [
  ['1990s', 'THE 90s'],
  ['2000s', 'THE 00s'],
  ['2010s', 'THE 10s'],
  ['2020s', 'THE 20s'],
];

/** Album sections in page order. Gold and Cult Heroes are big, so they're split by decade. */
export const ALBUM_SECTIONS: AlbumSection[] = [
  { id: 'holo', title: 'HOLO HEROES', blurb: 'Prime Icons, 91+. The shiniest stickers in the book.', colour: '#e62e2d', finish: 'holo' },
  ...DECADES.map(([d, name]) => ({ id: `gold-${d}`, title: `GOLDEN GREATS: ${name}`, blurb: 'Gold foil, rated 86–90.', colour: '#a97a1f', finish: 'gold' as const })),
  { id: 'WORLD CLASS', title: 'WORLD CLASS', blurb: 'Elite stickers at the top of their game.', colour: '#2563eb' },
  { id: 'RISING STAR', title: 'RISING STARS', blurb: 'Elite stickers from breakthrough seasons.', colour: '#10b981' },
  { id: 'PRIME', title: 'PRIME TIME', blurb: 'Elite stickers from career-best seasons.', colour: '#db2777' },
  { id: 'LEGEND', title: 'LEGENDS', blurb: 'Elite stickers from the farewell tours.', colour: '#a0522d' },
  { id: 'VETERAN', title: 'OLD HANDS', blurb: 'Elite veterans who still had it.', colour: '#8b5cf6' },
  ...DECADES.map(([d, name]) => ({ id: `CULT HERO-${d}`, title: `CULT HEROES OF ${name}`, blurb: 'Elite stickers the fans still sing about.', colour: '#dc2626' })),
  { id: 'SQUAD', title: 'SQUAD STALWARTS', blurb: 'Elite stickers from steady seasons.', colour: '#64748b' },
];

export function albumSection(c: PlayerCard): string {
  if (c.tier === 'PRIME_ICON') return 'holo';
  if (c.tier === 'RISING_WORLD') return `gold-${c.decade}`;
  if (c.era === 'CULT HERO') return `CULT HERO-${c.decade}`;
  return ALBUM_SECTIONS.some((s) => s.id === c.era) ? c.era : 'SQUAD';
}
