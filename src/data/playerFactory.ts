import type {
  Archetype,
  CaricatureTraits,
  Decade,
  EraLabel,
  PlayerCard,
  Position,
  Tier,
} from '../types/game';

export function tierFromOvr(ovr: number): Tier {
  if (ovr >= 91) return 'PRIME_ICON';
  if (ovr >= 86) return 'RISING_WORLD';
  if (ovr >= 81) return 'CULT_VETERAN';
  return 'STANDARD';
}

export function decadeFromSeason(season: string): Decade {
  const start = parseInt(season.slice(0, 2), 10);
  if (start >= 90) return '1990s';
  if (start < 10) return '2000s';
  if (start < 20) return '2010s';
  return '2020s';
}

/** [pac, sho, pas, dri, def, phy] */
export type StatTuple = [number, number, number, number, number, number];

/**
 * One era variant:
 * [season, era, ovr, positions ("ST/LW"), clubCode, archetype, stats, optional trait overrides for this era]
 */
export type VariantTuple = [
  string,
  EraLabel,
  number,
  string,
  string,
  Archetype,
  StatTuple,
  Partial<CaricatureTraits>?,
];

export function player(
  basePlayerId: string,
  name: string,
  shortName: string,
  nation: string,
  traits: CaricatureTraits,
  variants: VariantTuple[],
): PlayerCard[] {
  return variants.map(([season, era, ovr, pos, club, archetype, s, override]) => ({
    id: `${basePlayerId}_${season.replace('-', '')}`,
    basePlayerId,
    name,
    shortName,
    season,
    era,
    decade: decadeFromSeason(season),
    ovr,
    tier: tierFromOvr(ovr),
    positions: pos.split('/') as Position[],
    club,
    nation,
    archetype,
    stats: { pac: s[0], sho: s[1], pas: s[2], dri: s[3], def: s[4], phy: s[5] },
    traits: { ...traits, ...(override ?? {}) },
  }));
}
