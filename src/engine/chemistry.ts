import { ADJACENT, FORMATIONS, positionGroup, slotAccepts } from '../data/formations';
import type {
  ChemLink,
  Formation,
  FormationId,
  Lineup,
  ManagerId,
  PlayerCard,
  Position,
  SlotFit,
  TeamRating,
} from '../types/game';

// ───────────────────────────── Positional fit ─────────────────────────────

export function fitFor(card: PlayerCard, slot: Position): Omit<SlotFit, 'slotId' | 'effectiveOvr'> {
  const [primary, ...secondary] = card.positions;
  if (slot === 'GK' || primary === 'GK') {
    return primary === slot ? { fit: 'natural', penalty: 0 } : { fit: 'oop', penalty: 35 };
  }
  if (primary === slot) return { fit: 'natural', penalty: 0 };
  if (slotAccepts(slot).includes(primary)) return { fit: 'natural', penalty: 1 };
  if (secondary.includes(slot)) return { fit: 'secondary', penalty: 1 };
  if (secondary.some((p) => slotAccepts(slot).includes(p))) return { fit: 'secondary', penalty: 2 };
  if (ADJACENT[primary].includes(slot) || secondary.some((p) => ADJACENT[p].includes(slot)))
    return { fit: 'adjacent', penalty: 5 };
  return { fit: 'oop', penalty: 12 };
}

// ───────────────────────────── Links ─────────────────────────────

const neighbourCache = new Map<FormationId, [string, string][]>();

export function neighbours(formation: Formation): [string, string][] {
  const cached = neighbourCache.get(formation.id);
  if (cached) return cached;
  const pairs: [string, string][] = [];
  const s = formation.slots;
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      const dx = s[i].x - s[j].x;
      const dy = (s[i].y - s[j].y) * 1.1;
      if (Math.hypot(dx, dy) < 36) pairs.push([s[i].id, s[j].id]);
    }
  }
  neighbourCache.set(formation.id, pairs);
  return pairs;
}

function linkBetween(a: PlayerCard, b: PlayerCard): { kind: ChemLink['kind']; strength: number } | null {
  let strength = 0;
  let kind: ChemLink['kind'] | null = null;
  if (a.club === b.club) {
    strength += a.decade === b.decade ? 3 : 2;
    kind = 'club';
  }
  if (a.nation === b.nation) {
    strength += 1;
    kind = kind ?? 'nation';
  }
  if (a.decade === b.decade) {
    strength += 1;
    kind = kind ?? 'decade';
  }
  return kind ? { kind, strength: Math.min(strength, 4) } : null;
}

// ───────────────────────────── Manager buffs ─────────────────────────────

interface ManagerEval {
  bonus: number;
  active: boolean;
  note: string;
}

function evalManager(managerId: ManagerId | null, formation: Formation, lineup: Lineup): ManagerEval {
  const placed = formation.slots
    .map((s) => ({ slot: s, card: lineup[s.id] }))
    .filter((x): x is { slot: typeof x.slot; card: PlayerCard } => !!x.card);
  const cards = placed.map((p) => p.card);
  const midCards = placed.filter((p) => positionGroup(p.slot.label) === 'MID').map((p) => p.card);
  const fwdCards = placed.filter((p) => positionGroup(p.slot.label) === 'FWD' || p.slot.label === 'CAM').map((p) => p.card);

  switch (managerId) {
    case 'heavy_metal': {
      const pacy = cards.filter((c) => c.positions[0] !== 'GK' && c.stats.pac >= 82).length;
      const engine = midCards.some((c) => c.archetype === 'Box-to-Box' || c.archetype === 'Destroyer');
      const active = pacy >= 5 && engine;
      return {
        bonus: active ? 1.5 : 0,
        active,
        note: `${Math.min(pacy, 5)}/5 rapid (82+ PAC) · ${engine ? '✓' : '✗'} Box-to-Box/Destroyer in midfield`,
      };
    }
    case 'tiki_taka': {
      const passers = cards.filter((c) => c.stats.pas >= 82).length;
      const conductor = cards.some((c) => c.archetype === 'Regista' || c.archetype === 'Advanced Playmaker');
      const active = passers >= 6 && conductor;
      return {
        bonus: active ? 1.5 : 0,
        active,
        note: `${Math.min(passers, 6)}/6 passers (82+ PAS) · ${conductor ? '✓' : '✗'} Regista/Adv. Playmaker`,
      };
    }
    case 'low_block': {
      const destroyer = placed.some(
        (p) => p.card.archetype === 'Destroyer' && (p.slot.label === 'CDM' || (p.slot.label === 'CM' && p.card.positions.includes('CDM'))),
      );
      const rocks = placed.filter((p) => p.slot.label === 'CB' && p.card.ovr >= 84 && p.card.positions.includes('CB')).length;
      const focal = cards.some((c) => c.archetype === 'Target Man' || c.archetype === 'Complete Forward');
      const active = destroyer && rocks >= 2 && focal;
      return {
        bonus: active ? 1.5 : 0,
        active,
        note: `${destroyer ? '✓' : '✗'} Destroyer at CDM · ${Math.min(rocks, 2)}/2 84+ CBs · ${focal ? '✓' : '✗'} Target Man/Complete Fwd`,
      };
    }
    case 'invincible_counter': {
      const classics = cards.filter((c) => c.decade === '1990s' || c.decade === '2000s').length;
      const runners = fwdCards.filter((c) => c.archetype === 'Speedster' || c.archetype === 'Inside Forward').length;
      const bonus = Math.min(1.5, classics * 0.25 + runners * 0.35);
      return {
        bonus: Math.round(bonus * 100) / 100,
        active: bonus >= 1.5,
        note: `${classics} '90s/'00s players · ${runners} Speedster/Inside Fwd attackers`,
      };
    }
    case 'fergie_time':
      return { bonus: 0, active: true, note: 'Late-goal probability ×2 when level or 1 down after 75\'' };
    case 'galactico': {
      const stars = cards.filter((c) => c.tier === 'RISING_WORLD' || c.tier === 'PRIME_ICON').length;
      return { bonus: Math.round(stars * 0.6 * 10) / 10, active: stars > 0, note: `${stars} Galácticos × +0.6` };
    }
    default:
      return { bonus: 0, active: false, note: '' };
  }
}

// ───────────────────────────── Team rating ─────────────────────────────

export function computeTeamRating(
  formationId: FormationId,
  lineup: Lineup,
  managerId: ManagerId | null,
): TeamRating {
  const formation = FORMATIONS[formationId];
  const fits: SlotFit[] = [];
  const groupOvr: Record<'GK' | 'DEF' | 'MID' | 'FWD', number[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  const chemPoints: Record<string, number> = {};

  for (const slot of formation.slots) {
    const card = lineup[slot.id];
    if (!card) continue;
    const f = fitFor(card, slot.label);
    const eff = card.ovr - f.penalty;
    fits.push({ slotId: slot.id, ...f, effectiveOvr: eff });
    groupOvr[positionGroup(slot.label)].push(eff);
    chemPoints[slot.id] = f.fit === 'natural' ? 4 : f.fit === 'secondary' ? 3 : f.fit === 'adjacent' ? 1 : 0;
  }

  const links: ChemLink[] = [];
  for (const [a, b] of neighbours(formation)) {
    const ca = lineup[a];
    const cb = lineup[b];
    if (!ca || !cb) continue;
    const l = linkBetween(ca, cb);
    if (!l) continue;
    links.push({ a, b, ...l });
    chemPoints[a] += l.strength;
    chemPoints[b] += l.strength;
  }

  const filled = fits.length;
  const chemSum = Object.values(chemPoints).reduce((s, v) => s + Math.min(10, v), 0);
  const chemistry = filled ? Math.round((chemSum / (filled * 10)) * 100) : 0;
  const baseAvg = filled ? fits.reduce((s, f) => s + f.effectiveOvr, 0) / filled : 0;
  const rawAvg = filled ? fits.reduce((s, f) => s + lineup[f.slotId]!.ovr, 0) / filled : 0;
  const oopPenalty = rawAvg - baseAvg;
  const chemBonus = filled ? Math.round(((chemistry - 45) / 55) * 1.6 * 10) / 10 : 0;

  const mgr = evalManager(managerId, formation, lineup);

  // Midfield defensive balance
  let balancePenalty = 0;
  let balanceNote: string | null = null;
  const mids = formation.slots.filter((s) => positionGroup(s.label) === 'MID').map((s) => lineup[s.id]).filter(Boolean) as PlayerCard[];
  if (mids.length >= 3) {
    const avgDef = mids.reduce((s, c) => s + c.stats.def, 0) / mids.length;
    const shield = mids.some((c) => ['Destroyer', 'Box-to-Box', 'Regista', 'Deep-Lying Playmaker'].includes(c.archetype));
    if (avgDef < 55 || !shield) {
      balancePenalty = managerId === 'galactico' ? 0 : 1.2;
      balanceNote =
        managerId === 'galactico'
          ? 'No midfield shield, but the Galáctico Collector does not care.'
          : 'Midfield has no defensive shield: −1.2 balance penalty.';
    }
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : baseAvg);
  const g = { GK: avg(groupOvr.GK), DEF: avg(groupOvr.DEF), MID: avg(groupOvr.MID), FWD: avg(groupOvr.FWD) };
  const lift = chemBonus + mgr.bonus - balancePenalty;
  const overall = Math.round((baseAvg + lift) * 10) / 10;
  const attack = Math.round((g.FWD * 0.55 + g.MID * 0.35 + g.DEF * 0.1 + lift) * 10) / 10;
  const midfield = Math.round((g.MID + lift) * 10) / 10;
  const defence = Math.round((g.DEF * 0.5 + g.GK * 0.3 + g.MID * 0.2 + lift - balancePenalty * 0.5) * 10) / 10;

  return {
    baseAvg: Math.round(baseAvg * 10) / 10,
    chemistry,
    chemBonus,
    managerBonus: mgr.bonus,
    managerActive: mgr.active,
    managerNote: mgr.note,
    oopPenalty: Math.round(oopPenalty * 10) / 10,
    balancePenalty,
    balanceNote,
    attack,
    midfield,
    defence,
    overall,
    links,
    fits,
  };
}

/** Best empty slot for a card (used for one-tap auto placement). */
export function bestSlotFor(card: PlayerCard, formationId: FormationId, lineup: Lineup): string | null {
  const formation = FORMATIONS[formationId];
  let best: { id: string; pen: number } | null = null;
  for (const slot of formation.slots) {
    if (lineup[slot.id]) continue;
    const { penalty } = fitFor(card, slot.label);
    if (!best || penalty < best.pen) best = { id: slot.id, pen: penalty };
  }
  return best?.id ?? null;
}
