import { FORMATIONS, positionGroup, slotAccepts } from '../data/formations';
import type { FormationId, Lineup, PlayerCard, PositionGroup, Position, Tier } from '../types/game';

export const TIER_ORDER: Tier[] = ['STANDARD', 'ELITE', 'RISING_WORLD', 'PRIME_ICON'];
export const TIER_RANK: Record<Tier, number> = { STANDARD: 0, ELITE: 1, RISING_WORLD: 2, PRIME_ICON: 3 };
const MAX_RANK = TIER_ORDER.length - 1;

export const TOTAL_PACKS = 11;
export const PACK_SIZE = 5;

export function tierRates(packNumber: number): Record<Tier, number> {
  // 81–85 is one rarity band (26%); its card colour comes from the era label.
  if (packNumber >= TOTAL_PACKS) return { STANDARD: 61.5, ELITE: 26, RISING_WORLD: 8.5, PRIME_ICON: 4 };
  return { STANDARD: 63.5, ELITE: 26, RISING_WORLD: 8.5, PRIME_ICON: 2 };
}

const BASE_GROUP_WEIGHTS: Record<PositionGroup, number> = { GK: 10, DEF: 35, MID: 35, FWD: 20 };

function weightedPick<T extends string>(weights: Record<T, number>, rng: () => number): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function pickRandom<T>(arr: T[], rng: () => number): T | undefined {
  return arr.length ? arr[Math.floor(rng() * arr.length)] : undefined;
}

export interface PackContext {
  packNumber: number; // 1..11
  pool: PlayerCard[];
  draftedBaseIds: Set<string>;
  formationId: FormationId | null;
  lineup: Lineup;
  rng?: () => number;
}

export interface EmptySlotInfo {
  slotId: string;
  label: Position;
}

export function emptySlots(formationId: FormationId | null, lineup: Lineup): EmptySlotInfo[] {
  if (!formationId) return [];
  return FORMATIONS[formationId].slots.filter((s) => !lineup[s.id]).map((s) => ({ slotId: s.id, label: s.label }));
}

export function cardFitsSlot(card: PlayerCard, slotLabel: Position): boolean {
  const ok = slotAccepts(slotLabel);
  return card.positions.some((p) => ok.includes(p));
}

function groupWeights(ctx: PackContext): Record<PositionGroup, number> {
  const w = { ...BASE_GROUP_WEIGHTS };
  if (ctx.packNumber < 6 || !ctx.formationId) return w;
  const empty = emptySlots(ctx.formationId, ctx.lineup);
  const emptyGroups = new Set(empty.map((s) => positionGroup(s.label)));
  (Object.keys(w) as PositionGroup[]).forEach((g) => {
    if (emptyGroups.has(g)) w[g] *= 2.5;
    else if (ctx.packNumber >= 9) w[g] *= 0.6;
  });
  if (emptyGroups.has('GK')) w.GK *= 1.6; // keeper pity
  return w;
}

function rollTier(packNumber: number, rng: () => number): Tier {
  return weightedPick(tierRates(packNumber), rng);
}

/** Pull a card for a target tier, falling back to the nearest tier if that bucket is exhausted. */
function drawCard(
  ctx: PackContext,
  tier: Tier,
  filter: (c: PlayerCard) => boolean,
  usedBase: Set<string>,
  rng: () => number,
): PlayerCard | undefined {
  const available = ctx.pool.filter((c) => !ctx.draftedBaseIds.has(c.basePlayerId) && !usedBase.has(c.basePlayerId) && filter(c));
  const rank = TIER_RANK[tier];
  const order = [0, -1, 1, -2, 2, -3, 3, -4, 4].map((d) => rank + d).filter((r) => r >= 0 && r <= MAX_RANK);
  for (const r of order) {
    const bucket = available.filter((c) => TIER_RANK[c.tier] === r);
    const pick = pickRandom(bucket, rng);
    if (pick) return pick;
  }
  return undefined;
}

export function generatePack(ctx: PackContext): PlayerCard[] {
  const rng = ctx.rng ?? Math.random;
  const usedBase = new Set<string>();
  const cards: PlayerCard[] = [];
  const weights = groupWeights(ctx);
  const empties = emptySlots(ctx.formationId, ctx.lineup);

  // Hard anti-softlock: guaranteed slot matches in packs 9–11.
  const guaranteed = ctx.packNumber >= 11 ? 3 : ctx.packNumber >= 9 ? 2 : 0;
  const mustMatch = Math.min(guaranteed, PACK_SIZE);
  if (mustMatch > 0 && empties.length > 0) {
    for (let i = 0; i < mustMatch; i++) {
      const target = empties[i % empties.length];
      const card = drawCard(ctx, rollTier(ctx.packNumber, rng), (c) => cardFitsSlot(c, target.label), usedBase, rng);
      if (card) {
        cards.push(card);
        usedBase.add(card.basePlayerId);
      }
    }
  }

  let guard = 0;
  while (cards.length < PACK_SIZE && guard++ < 50) {
    const group = weightedPick(weights, rng);
    const card =
      drawCard(ctx, rollTier(ctx.packNumber, rng), (c) => positionGroup(c.positions[0]) === group, usedBase, rng) ??
      drawCard(ctx, rollTier(ctx.packNumber, rng), () => true, usedBase, rng);
    if (!card) break;
    cards.push(card);
    usedBase.add(card.basePlayerId);
  }

  // Pack 11 "Captain's Finale": guarantee an 86+ card, ideally one that fits an empty slot.
  if (ctx.packNumber >= TOTAL_PACKS && !cards.some((c) => c.ovr >= 86)) {
    const fitsEmpty = (c: PlayerCard) => empties.length === 0 || empties.some((s) => cardFitsSlot(c, s.label));
    const star =
      drawCard(ctx, rng() < 0.25 ? 'PRIME_ICON' : 'RISING_WORLD', (c) => c.ovr >= 86 && fitsEmpty(c), usedBase, rng) ??
      drawCard(ctx, 'RISING_WORLD', (c) => c.ovr >= 86, usedBase, rng);
    if (star) {
      // Replace the weakest card that is NOT one of the guaranteed slot matches (unless the star fits too).
      let idx = -1;
      let low = Infinity;
      cards.forEach((c, i) => {
        const protectedMatch = i < mustMatch && !fitsEmpty(star);
        if (!protectedMatch && c.ovr < low) {
          low = c.ovr;
          idx = i;
        }
      });
      if (idx >= 0) cards[idx] = star;
      else cards.push(star);
    }
  }

  // Shuffle so guaranteed cards aren't always first.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, PACK_SIZE);
}

export function highestTier(cards: PlayerCard[]): Tier {
  return cards.reduce<Tier>((best, c) => (TIER_RANK[c.tier] > TIER_RANK[best] ? c.tier : best), 'STANDARD');
}
