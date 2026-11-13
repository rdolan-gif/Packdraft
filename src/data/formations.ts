import type { Formation, FormationId, Position, PositionGroup } from '../types/game';

// y = 0 is the opponent's goal line (top of pitch), y = 100 is our goal line.
export const FORMATIONS: Record<FormationId, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3 Attack',
    description: 'Wide forwards, a pivot and two shuttlers. Pressing heaven.',
    slots: [
      { id: 'lw', label: 'LW', x: 18, y: 18 },
      { id: 'st', label: 'ST', x: 50, y: 12 },
      { id: 'rw', label: 'RW', x: 82, y: 18 },
      { id: 'lcm', label: 'CM', x: 30, y: 44 },
      { id: 'cdm', label: 'CDM', x: 50, y: 56 },
      { id: 'rcm', label: 'CM', x: 70, y: 44 },
      { id: 'lb', label: 'LB', x: 12, y: 72 },
      { id: 'lcb', label: 'CB', x: 37, y: 78 },
      { id: 'rcb', label: 'CB', x: 63, y: 78 },
      { id: 'rb', label: 'RB', x: 88, y: 72 },
      { id: 'gk', label: 'GK', x: 50, y: 93 },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2 Classic',
    description: 'Two up top, two banks of four. Proper football.',
    slots: [
      { id: 'lst', label: 'ST', x: 37, y: 14 },
      { id: 'rst', label: 'ST', x: 63, y: 14 },
      { id: 'lm', label: 'LM', x: 12, y: 42 },
      { id: 'lcm', label: 'CM', x: 37, y: 48 },
      { id: 'rcm', label: 'CM', x: 63, y: 48 },
      { id: 'rm', label: 'RM', x: 88, y: 42 },
      { id: 'lb', label: 'LB', x: 12, y: 74 },
      { id: 'lcb', label: 'CB', x: 37, y: 79 },
      { id: 'rcb', label: 'CB', x: 63, y: 79 },
      { id: 'rb', label: 'RB', x: 88, y: 74 },
      { id: 'gk', label: 'GK', x: 50, y: 93 },
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1 Wide',
    description: 'Double pivot shield, a No.10 pulling strings behind a lone striker.',
    slots: [
      { id: 'st', label: 'ST', x: 50, y: 10 },
      { id: 'lw', label: 'LW', x: 16, y: 28 },
      { id: 'cam', label: 'CAM', x: 50, y: 30 },
      { id: 'rw', label: 'RW', x: 84, y: 28 },
      { id: 'lcdm', label: 'CDM', x: 37, y: 54 },
      { id: 'rcdm', label: 'CDM', x: 63, y: 54 },
      { id: 'lb', label: 'LB', x: 12, y: 73 },
      { id: 'lcb', label: 'CB', x: 37, y: 79 },
      { id: 'rcb', label: 'CB', x: 63, y: 79 },
      { id: 'rb', label: 'RB', x: 88, y: 73 },
      { id: 'gk', label: 'GK', x: 50, y: 93 },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2 Wing-Backs',
    description: 'Three centre-backs, marauding wing-backs, a strike partnership.',
    slots: [
      { id: 'lst', label: 'ST', x: 37, y: 13 },
      { id: 'rst', label: 'ST', x: 63, y: 13 },
      { id: 'lm', label: 'LM', x: 10, y: 40 },
      { id: 'lcm', label: 'CM', x: 32, y: 42 },
      { id: 'cdm', label: 'CDM', x: 50, y: 54 },
      { id: 'rcm', label: 'CM', x: 68, y: 42 },
      { id: 'rm', label: 'RM', x: 90, y: 40 },
      { id: 'lcb', label: 'CB', x: 27, y: 77 },
      { id: 'ccb', label: 'CB', x: 50, y: 81 },
      { id: 'rcb', label: 'CB', x: 73, y: 77 },
      { id: 'gk', label: 'GK', x: 50, y: 94 },
    ],
  },
  '4-1-2-1-2': {
    id: '4-1-2-1-2',
    name: '4-1-2-1-2 Diamond',
    description: 'Narrow diamond: an anchor, two runners, a No.10 and two strikers.',
    slots: [
      { id: 'lst', label: 'ST', x: 38, y: 11 },
      { id: 'rst', label: 'ST', x: 62, y: 11 },
      { id: 'cam', label: 'CAM', x: 50, y: 28 },
      { id: 'lcm', label: 'CM', x: 28, y: 44 },
      { id: 'rcm', label: 'CM', x: 72, y: 44 },
      { id: 'cdm', label: 'CDM', x: 50, y: 58 },
      { id: 'lb', label: 'LB', x: 12, y: 74 },
      { id: 'lcb', label: 'CB', x: 37, y: 80 },
      { id: 'rcb', label: 'CB', x: 63, y: 80 },
      { id: 'rb', label: 'RB', x: 88, y: 74 },
      { id: 'gk', label: 'GK', x: 50, y: 93 },
    ],
  },
};

export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

export function positionGroup(pos: Position): PositionGroup {
  if (pos === 'GK') return 'GK';
  if (pos === 'RB' || pos === 'CB' || pos === 'LB') return 'DEF';
  if (pos === 'RW' || pos === 'LW' || pos === 'ST') return 'FWD';
  return 'MID';
}

// "Adjacent" positions: playable with a modest penalty (out-of-position rules).
export const ADJACENT: Record<Position, Position[]> = {
  GK: [],
  RB: ['LB', 'CB', 'RM'],
  LB: ['RB', 'CB', 'LM'],
  CB: ['RB', 'LB', 'CDM'],
  CDM: ['CM', 'CB'],
  CM: ['CDM', 'CAM', 'RM', 'LM'],
  CAM: ['CM', 'ST', 'RW', 'LW'],
  RM: ['RW', 'CM', 'RB', 'LM'],
  LM: ['LW', 'CM', 'LB', 'RM'],
  RW: ['RM', 'LW', 'ST', 'CAM'],
  LW: ['LM', 'RW', 'ST', 'CAM'],
  ST: ['CAM', 'RW', 'LW'],
};

/** Positions that fully satisfy a slot (used by the anti-softlock pack generator). */
export function slotAccepts(slot: Position): Position[] {
  const extra: Partial<Record<Position, Position[]>> = { RM: ['RW'], LM: ['LW'], RW: ['RM'], LW: ['LM'] };
  return [slot, ...(extra[slot] ?? [])];
}
