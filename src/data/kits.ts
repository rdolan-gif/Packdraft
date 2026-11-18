import type { CollarStyle, KitDesign, KitPattern } from '../types/game';
import { getClub } from './clubs';

/**
 * Neckline by era: polo collars through the 90s, V-necks in the 2000s, crew necks from the 2010s.
 * (Kit variants such as goalkeeper and away shirts can hang off this file later.)
 */
export function collarForSeason(season: string): CollarStyle {
  const yy = parseInt(season.slice(0, 2), 10);
  const year = yy >= 90 ? 1900 + yy : 2000 + yy;
  if (year < 2001) return 'polo';
  if (year < 2011) return 'v';
  return 'crew';
}

// ───────────────────────────── Kit designs ─────────────────────────────
// Every club and season gets a shirt design: the club's signature pattern where it has one, otherwise
// era-flavoured details (90s shadow prints, 2000s piping, cleaner modern shirts), our own badge and a
// generic maker's mark. Nothing here copies a real crest or a real manufacturer's logo.


const seasonYear = (season: string) => {
  const yy = parseInt(season.slice(0, 2), 10);
  return yy >= 90 ? 1900 + yy : 2000 + yy;
};

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 0..1 lightness of a hex colour. */
function light(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Clubs whose home shirt is defined by a pattern: body colour, pattern and pattern colour. */
const SIGNATURE: Record<string, { body: string; pattern: KitPattern; color: string; sleeve?: string }> = {
  NEW: { body: '#ffffff', pattern: 'stripes', color: '#241f20', sleeve: '#241f20' },
  SUN: { body: '#ffffff', pattern: 'stripes', color: '#eb172b', sleeve: '#eb172b' },
  STK: { body: '#ffffff', pattern: 'stripes', color: '#e03a3e', sleeve: '#e03a3e' },
  SOU: { body: '#ffffff', pattern: 'stripes', color: '#d71920', sleeve: '#d71920' },
  BRE: { body: '#ffffff', pattern: 'stripes', color: '#e30613', sleeve: '#e30613' },
  WBA: { body: '#ffffff', pattern: 'stripes', color: '#122f67', sleeve: '#122f67' },
  CRY: { body: '#1b458f', pattern: 'stripes', color: '#c4122e', sleeve: '#1b458f' },
  BOU: { body: '#da291c', pattern: 'stripes', color: '#111111', sleeve: '#111111' },
  HUL: { body: '#f5a12d', pattern: 'stripes', color: '#111111', sleeve: '#111111' },
  BRI: { body: '#ffffff', pattern: 'stripes', color: '#0057b8', sleeve: '#0057b8' },
  QPR: { body: '#ffffff', pattern: 'hoops', color: '#1d5ba4', sleeve: '#1d5ba4' },
  BLB: { body: '#ffffff', pattern: 'halves', color: '#009ee0', sleeve: '#009ee0' },
};

/** A few famous one-season shirts. */
const SPECIAL: Record<string, Partial<KitDesign>> = {
  'ARS 05-06': { body: '#7b1b2a', sleeve: '#7b1b2a', collar: '#d9b77a', trim: '#d9b77a', pattern: 'plain' }, // the redcurrant farewell to Highbury
};

const GK_COLOURS: Record<'90s' | '00s' | 'now', string[]> = {
  '90s': ['#16a34a', '#7c3aed', '#0ea5e9', '#f59e0b', '#e11d48', '#334155'],
  '00s': ['#facc15', '#22c55e', '#64748b', '#111827', '#f97316', '#0891b2'],
  now: ['#22c55e', '#a3e635', '#f472b6', '#111827', '#fbbf24', '#38bdf8', '#a855f7'],
};

/** The shirt for a card: its club and season, a goalkeeper kit for keepers, or a fan's club (dev cards). */
export function kitForCard(card: { club: string; season: string; positions: string[] }, clubOverride?: string): KitDesign {
  const club = getClub(clubOverride ?? card.club);
  const year = seasonYear(card.season);
  const era: '90s' | '00s' | 'now' = year < 2001 ? '90s' : year < 2011 ? '00s' : 'now';
  const h = hashStr(`${club.code} ${card.season}`);
  const pick = (n: number, shift: number) => ((h >>> shift) % 1000) / 1000 < n;
  const collarStyle = collarForSeason(card.season);
  const makerMarks = ['chevron', 'bars', 'diamond', 'dot'] as const;
  const badgeShapes = ['shield', 'round', 'crest'] as const;

  // Goalkeepers: their own shirt, loud in the 90s, cleaner later.
  if (card.positions[0] === 'GK' && !clubOverride) {
    const list = GK_COLOURS[era].filter((c) => c !== club.primary);
    const body = list[h % list.length];
    const contrast = light(body) > 0.55 ? '#111827' : '#ffffff';
    return {
      body,
      sleeve: body,
      collar: contrast,
      trim: contrast,
      collarStyle,
      pattern: era === '90s' ? 'shadow' : pick(0.4, 3) ? 'chestband' : 'plain',
      patternColor: era === '90s' ? contrast : club.primary,
      bands: 0,
      piping: era === '00s',
      badge: { shape: badgeShapes[hashStr(club.code) % 3], fill: light(body) > 0.6 ? club.primary : '#ffffff', band: club.secondary },
      maker: { mark: makerMarks[(h >>> 7) % 4], color: contrast },
      gk: true,
    };
  }

  const sig = SIGNATURE[club.code];
  const body = sig?.body ?? club.primary;
  let pattern: KitPattern = sig?.pattern ?? 'plain';
  let patternColor = sig?.color ?? club.secondary;
  const sleeve = sig?.sleeve ?? club.sleeve;
  let piping = false;
  if (!sig) {
    const dark = light(body) < 0.45;
    if (era === '90s') {
      if (pick(0.4, 3)) {
        pattern = 'shadow';
        patternColor = dark ? '#ffffff' : '#000000';
      } else if (pick(0.18, 9)) pattern = 'yoke';
    } else if (era === '00s') {
      piping = pick(0.55, 4);
      if (pick(0.2, 11)) pattern = 'pinstripes';
      else if (pick(0.15, 15)) pattern = 'yoke';
    } else {
      if (pick(0.18, 5)) pattern = 'pinstripes';
      else if (pick(0.1, 13)) pattern = 'chestband';
    }
    if (pattern === 'pinstripes' && patternColor === body) patternColor = club.accent;
  }
  const bands = pattern === 'hoops' ? 6 : era === '90s' ? 5 : era === '00s' ? 7 : 9;
  const trim = club.collar === body ? club.secondary : club.collar;
  const kit: KitDesign = {
    body,
    sleeve,
    collar: club.collar === body ? club.secondary : club.collar,
    trim,
    collarStyle,
    pattern,
    patternColor,
    bands,
    piping,
    badge: { shape: badgeShapes[hashStr(club.code) % 3], fill: light(body) > 0.6 ? (light(club.primary) > 0.6 ? club.secondary : club.primary) : '#ffffff', band: light(body) > 0.6 ? club.accent : club.primary === body ? club.secondary : club.primary },
    maker: { mark: makerMarks[(h >>> 7) % 4], color: light(body) > 0.6 ? '#1f2937' : trim === body ? '#ffffff' : trim },
    gk: false,
  };
  return { ...kit, ...(SPECIAL[`${club.code} ${card.season}`] ?? {}) };
}
