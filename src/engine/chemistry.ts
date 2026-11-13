import { ADJACENT, FORMATIONS, positionGroup, slotAccepts } from '../data/formations';
import type {
  ChemLink,
  ManagerCheck,
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
  checks: ManagerCheck[];
}

const isEngine = (c: PlayerCard) => c.archetype === 'Box-to-Box' || c.archetype === 'Destroyer';
const isConductor = (c: PlayerCard) => c.archetype === 'Regista' || c.archetype === 'Advanced Playmaker';
const isFocal = (c: PlayerCard) => c.archetype === 'Target Man' || c.archetype === 'Complete Forward';
const isRunner = (c: PlayerCard) => c.archetype === 'Speedster' || c.archetype === 'Inside Forward';
const isClassic = (c: PlayerCard) => c.decade === '1990s' || c.decade === '2000s';
const isStar = (c: PlayerCard) => c.tier === 'RISING_WORLD' || c.tier === 'PRIME_ICON';
const isAttackSlot = (label: Position) => positionGroup(label) === 'FWD' || label === 'CAM';
const isDestroyerAtBase = (c: PlayerCard, label: Position) =>
  c.archetype === 'Destroyer' && (label === 'CDM' || (label === 'CM' && c.positions.includes('CDM')));
const isRock = (c: PlayerCard, label: Position) => label === 'CB' && c.ovr >= 84 && c.positions.includes('CB');

function evalManager(managerId: ManagerId | null, formation: Formation, lineup: Lineup): ManagerEval {
  const placed = formation.slots
    .map((s) => ({ slot: s, card: lineup[s.id] }))
    .filter((x): x is { slot: typeof x.slot; card: PlayerCard } => !!x.card);
  const cards = placed.map((p) => p.card);
  const midCards = placed.filter((p) => positionGroup(p.slot.label) === 'MID').map((p) => p.card);
  const names = (cs: PlayerCard[]) => cs.map((c) => c.shortName).join(', ');

  switch (managerId) {
    case 'heavy_metal': {
      const pacy = cards.filter((c) => c.positions[0] !== 'GK' && c.stats.pac >= 82);
      const engines = midCards.filter(isEngine);
      const active = pacy.length >= 5 && engines.length > 0;
      return {
        bonus: active ? 1.5 : 0,
        active,
        note: `${Math.min(pacy.length, 5)}/5 rapid (82+ PAC) · ${engines.length ? '✓' : '✗'} Box-to-Box/Destroyer in midfield`,
        checks: [
          { label: '5+ outfield players with 82+ Pace', done: pacy.length >= 5, progress: `${pacy.length}/5`, who: names(pacy) },
          { label: 'A Box-to-Box or Destroyer playing in midfield', done: engines.length > 0, progress: engines.length ? '✓' : '0/1', who: names(engines) },
        ],
      };
    }
    case 'tiki_taka': {
      const passers = cards.filter((c) => c.stats.pas >= 82);
      const conductors = cards.filter(isConductor);
      const active = passers.length >= 6 && conductors.length > 0;
      return {
        bonus: active ? 1.5 : 0,
        active,
        note: `${Math.min(passers.length, 6)}/6 passers (82+ PAS) · ${conductors.length ? '✓' : '✗'} Regista/Adv. Playmaker`,
        checks: [
          { label: '6+ players with 82+ Passing', done: passers.length >= 6, progress: `${passers.length}/6`, who: names(passers) },
          { label: 'A Regista or Advanced Playmaker in the XI', done: conductors.length > 0, progress: conductors.length ? '✓' : '0/1', who: names(conductors) },
        ],
      };
    }
    case 'low_block': {
      const destroyers = placed.filter((p) => isDestroyerAtBase(p.card, p.slot.label)).map((p) => p.card);
      const rocks = placed.filter((p) => isRock(p.card, p.slot.label)).map((p) => p.card);
      const focal = cards.filter(isFocal);
      const active = destroyers.length > 0 && rocks.length >= 2 && focal.length > 0;
      return {
        bonus: active ? 1.5 : 0,
        active,
        note: `${destroyers.length ? '✓' : '✗'} Destroyer at CDM · ${Math.min(rocks.length, 2)}/2 84+ CBs · ${focal.length ? '✓' : '✗'} Target Man/Complete Fwd`,
        checks: [
          { label: 'A Destroyer playing at CDM', done: destroyers.length > 0, progress: destroyers.length ? '✓' : '0/1', who: names(destroyers) },
          { label: 'Two natural CBs rated 84+ at centre-back', done: rocks.length >= 2, progress: `${Math.min(rocks.length, 2)}/2`, who: names(rocks) },
          { label: 'A Target Man or Complete Forward', done: focal.length > 0, progress: focal.length ? '✓' : '0/1', who: names(focal) },
        ],
      };
    }
    case 'invincible_counter': {
      const classics = cards.filter(isClassic);
      const runners = placed.filter((p) => isAttackSlot(p.slot.label) && isRunner(p.card)).map((p) => p.card);
      const bonus = Math.min(1.5, classics.length * 0.25 + runners.length * 0.35);
      return {
        bonus: Math.round(bonus * 100) / 100,
        active: bonus >= 1.5,
        note: `${classics.length} '90s/'00s players · ${runners.length} Speedster/Inside Fwd attackers`,
        checks: [
          { label: `+0.25 per 1990s/2000s player (${classics.length} = +${(classics.length * 0.25).toFixed(2)})`, done: classics.length > 0, progress: `${classics.length}`, who: names(classics) },
          { label: `+0.35 per Speedster / Inside Forward in attack (${runners.length} = +${(runners.length * 0.35).toFixed(2)})`, done: runners.length > 0, progress: `${runners.length}`, who: names(runners) },
          { label: 'Maximum bonus +1.5', done: bonus >= 1.5, progress: `+${bonus.toFixed(2)}` },
        ],
      };
    }
    case 'fergie_time':
      return {
        bonus: 0,
        active: true,
        note: "Late-goal probability ×2 when level or 1 down after 75'",
        checks: [{ label: "Always on: when you're level or 1 goal down after 75', your chance of scoring doubles", done: true, progress: '✓' }],
      };
    case 'galactico': {
      const stars = cards.filter(isStar);
      return {
        bonus: Math.round(stars.length * 0.6 * 10) / 10,
        active: stars.length > 0,
        note: `${stars.length} Galáctico${stars.length === 1 ? '' : 's'} (World Class / Prime) at +0.6 each`,
        checks: [
          { label: '+0.6 per World Class or Prime Icon card (no limit)', done: stars.length > 0, progress: `${stars.length} = +${(stars.length * 0.6).toFixed(1)}`, who: names(stars) },
          { label: 'Midfield balance penalty ignored', done: true, progress: '✓' },
        ],
      };
    }
    default:
      return { bonus: 0, active: false, note: '', checks: [] };
  }
}

/** Which parts of the manager's objective this player helps with, in this slot. */
export function managerContribution(managerId: ManagerId | null, card: PlayerCard, slot: Position): string[] {
  const out: string[] = [];
  switch (managerId) {
    case 'heavy_metal':
      if (card.positions[0] !== 'GK' && card.stats.pac >= 82) out.push(`Rapid: ${card.stats.pac} Pace (82+)`);
      if (positionGroup(slot) === 'MID' && isEngine(card)) out.push(`${card.archetype} in midfield`);
      break;
    case 'tiki_taka':
      if (card.stats.pas >= 82) out.push(`Passer: ${card.stats.pas} Passing (82+)`);
      if (isConductor(card)) out.push(`${card.archetype}: the conductor`);
      break;
    case 'low_block':
      if (isDestroyerAtBase(card, slot)) out.push('Destroyer at CDM');
      if (isRock(card, slot)) out.push(`84+ centre-back (${card.ovr})`);
      if (isFocal(card)) out.push(`${card.archetype} up top`);
      break;
    case 'invincible_counter':
      if (isClassic(card)) out.push(`${card.decade} player: +0.25`);
      if (isAttackSlot(slot) && isRunner(card)) out.push(`${card.archetype} in attack: +0.35`);
      break;
    case 'galactico':
      if (isStar(card)) out.push('Galáctico: +0.6');
      break;
  }
  return out;
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
    managerChecks: mgr.checks,
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
