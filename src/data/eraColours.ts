import type { EraLabel, PlayerCard } from '../types/game';

/**
 * One colour per era label.
 * - 81–85 (Elite) cards are painted in their label's colour.
 * - 86–90 gold cards get a trim (border, ring, badge) in their label's colour.
 * Edit here to restyle a label everywhere (cards, pack flashes, share grid).
 */
export interface EraColour {
  name: string;
  light: string;
  mid: string;
  dark: string;
  border: string;
  emoji: string;
}

export const ERA_COLOURS: Record<EraLabel, EraColour> = {
  SQUAD: { name: 'Steel', light: '#cbd5e1', mid: '#64748b', dark: '#1e293b', border: '#e2e8f0', emoji: '🔲' },
  'CULT HERO': { name: 'Red', light: '#f87171', mid: '#dc2626', dark: '#450a0a', border: '#fca5a5', emoji: '🟥' },
  VETERAN: { name: 'Purple', light: '#c4b5fd', mid: '#8b5cf6', dark: '#2e1065', border: '#ddd6fe', emoji: '🟪' },
  'RISING STAR': { name: 'Emerald', light: '#6ee7b7', mid: '#10b981', dark: '#064e3b', border: '#a7f3d0', emoji: '🟩' },
  'WORLD CLASS': { name: 'Royal blue', light: '#93c5fd', mid: '#2563eb', dark: '#172554', border: '#bfdbfe', emoji: '🟦' },
  PRIME: { name: 'Magenta', light: '#f9a8d4', mid: '#db2777', dark: '#500724', border: '#fbcfe8', emoji: '🩷' },
  LEGEND: { name: 'Bronze', light: '#e7b98a', mid: '#a0522d', dark: '#2a1208', border: '#f5d0a9', emoji: '🟫' },
};

export const eraColour = (era: EraLabel) => ERA_COLOURS[era] ?? ERA_COLOURS.SQUAD;

/** Share-grid emoji for a card: grey squad, label colour (81–85), gold, white. */
export function cardEmoji(card: PlayerCard): string {
  if (card.tier === 'PRIME_ICON') return '⬜';
  if (card.tier === 'RISING_WORLD') return '🟨';
  if (card.tier === 'ELITE') return eraColour(card.era).emoji;
  return '⬛';
}
