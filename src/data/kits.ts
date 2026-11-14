import type { CollarStyle } from '../types/game';

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
