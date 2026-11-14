// ───────────────────────────── Core enums ─────────────────────────────

export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'ST';
export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Rarity by OVR: 74–80 Standard · 81–85 Elite (coloured by era label) · 86–90 gold · 91–96 Prime Icon. */
export type Tier = 'STANDARD' | 'ELITE' | 'RISING_WORLD' | 'PRIME_ICON';

export type EraLabel =
  | 'SQUAD'
  | 'CULT HERO'
  | 'VETERAN'
  | 'RISING STAR'
  | 'WORLD CLASS'
  | 'PRIME'
  | 'LEGEND';

export type Decade = '1990s' | '2000s' | '2010s' | '2020s';

export type Archetype =
  | 'Shot Stopper'
  | 'Sweeper Keeper'
  | 'Stopper'
  | 'Ball-Playing CB'
  | 'Full-Back'
  | 'Wing-Back'
  | 'Destroyer'
  | 'Regista'
  | 'Deep-Lying Playmaker'
  | 'Box-to-Box'
  | 'Advanced Playmaker'
  | 'Shadow Striker'
  | 'Winger'
  | 'Inside Forward'
  | 'Speedster'
  | 'Poacher'
  | 'Target Man'
  | 'Complete Forward'
  | 'False Nine';

// ───────────────────────────── Caricature traits ─────────────────────────────

export type SkinTone = 'pale' | 'light' | 'tan' | 'olive' | 'brown' | 'dark' | 'deep';
export type HairStyle =
  | 'buzz'
  | 'short'
  | 'quiff'
  | 'curly'
  | 'afro'
  | 'bald'
  | 'ponytail'
  | 'long'
  | 'mohawk'
  | 'slick'
  | 'dreads'
  | 'spiky'
  | 'manbun'
  | 'fringe'
  | 'cornrows';
export type HairColor = 'black' | 'darkbrown' | 'brown' | 'blonde' | 'ginger' | 'grey' | 'bleached';
export type FacialHair = 'none' | 'stubble' | 'goatee' | 'beard' | 'fullbeard' | 'moustache';
export type HeadShape = 'round' | 'oval' | 'square' | 'long' | 'heart';
export type Expression = 'grin' | 'smirk' | 'determined' | 'roar' | 'cool' | 'focused' | 'tongue';
export type Accessory = 'none' | 'headband' | 'scrumcap' | 'goggles' | 'alice' | 'earring' | 'captainband' | 'snood';

export interface CaricatureTraits {
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: HairColor;
  facialHair: FacialHair;
  headShape: HeadShape;
  expression: Expression;
  accessory: Accessory;
}

export interface CaricatureProps {
  traits: CaricatureTraits;
  kitPrimaryColor: string;
  kitSecondaryColor: string;
  kitSleeveColor?: string; // defaults to kitSecondaryColor
  kitCollarColor?: string; // defaults to kitSecondaryColor
  seed: string;
  size?: number;
  className?: string;
}

// ───────────────────────────── Cards ─────────────────────────────

export interface PlayerStats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface PlayerCard {
  id: string; // unique per era variant, e.g. rooney_wayne_0809
  basePlayerId: string; // shared by all era variants, e.g. rooney_wayne
  name: string; // "Wayne Rooney"
  shortName: string; // "Rooney"
  season: string; // "08-09"
  era: EraLabel;
  decade: Decade;
  ovr: number;
  tier: Tier;
  positions: Position[]; // primary first
  club: string; // club code, see data/clubs.ts
  nation: string;
  archetype: Archetype;
  stats: PlayerStats;
  traits: CaricatureTraits;
}

export interface Club {
  code: string;
  name: string;
  short: string;
  primary: string;
  secondary: string; // card stripe, badge text, league-table chip
  sleeve: string; // shirt sleeves on the portrait
  collar: string; // shirt collar on the portrait
  accent: string;
}

// ───────────────────────────── Managers & formations ─────────────────────────────

export type ManagerId =
  | 'heavy_metal'
  | 'tiki_taka'
  | 'low_block'
  | 'invincible_counter'
  | 'fergie_time'
  | 'galactico'
  | 'long_ball'
  | 'academy'
  | 'old_guard'
  | 'club_dna'
  | 'global_scout'
  | 'wing_play';

export interface ManagerCard {
  id: ManagerId;
  name: string;
  inspiredBy: string;
  tagline: string;
  description: string;
  bonusText: string;
  emoji: string;
  gradient: string; // tailwind gradient classes
  preferredFormations: FormationId[];
  /** Relative chance of appearing in the 3-card manager deal (default 1). */
  dealWeight?: number;
}

export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '4-1-2-1-2';

export interface FormationSlot {
  id: string;
  label: Position;
  x: number; // 0..100 (left → right)
  y: number; // 0..100 (attack top → goal bottom)
}

export interface Formation {
  id: FormationId;
  name: string;
  description: string;
  slots: FormationSlot[];
}

export type Lineup = Record<string, PlayerCard | null>; // slotId → card

// ───────────────────────────── Chemistry ─────────────────────────────

export type LinkKind = 'club' | 'nation' | 'decade';

export interface ChemLink {
  a: string; // slot id
  b: string;
  kind: LinkKind;
  strength: number;
}

export interface SlotFit {
  slotId: string;
  fit: 'natural' | 'secondary' | 'adjacent' | 'oop';
  penalty: number;
  effectiveOvr: number;
}

export interface ManagerCheck {
  label: string;
  done: boolean;
  progress: string;
  who?: string;
}

export interface TeamRating {
  baseAvg: number;
  chemistry: number; // 0..100
  chemBonus: number;
  managerBonus: number;
  managerActive: boolean;
  managerNote: string;
  managerChecks: ManagerCheck[];
  oopPenalty: number;
  balancePenalty: number;
  balanceNote: string | null;
  attack: number;
  midfield: number;
  defence: number;
  overall: number;
  links: ChemLink[];
  fits: SlotFit[];
}

// ───────────────────────────── Season ─────────────────────────────

export type TacticalShout = 'attack' | 'balanced' | 'bus';

export interface GoalEvent {
  minute: number;
  scorerId: string;
  scorerName: string;
  assistId: string | null;
  assistName: string | null;
  teamId: string;
}

export interface MatchResult {
  matchweek: number;
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  goals: GoalEvent[];
  headline: string | null;
  involvesUser: boolean;
  shout?: TacticalShout;
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface LeaguePlayer {
  id: string;
  name: string;
  teamId: string;
  pos: Position;
  isUser: boolean;
  card?: PlayerCard;
  // simulation weights
  scoreWeight: number;
  assistWeight: number;
}

export interface PlayerSeasonStats {
  id: string;
  name: string;
  teamId: string;
  isUser: boolean;
  goals: number;
  assists: number;
  cleanSheets: number;
  apps: number;
  ratingSum: number;
}

export interface SimTeam {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  attack: number;
  defence: number;
  isUser: boolean;
  players: LeaguePlayer[];
}

export type Grade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface SeasonSummary {
  grade: Grade;
  position: number;
  record: TableRow;
  mvp: PlayerSeasonStats | null;
  mvpCard: PlayerCard | null;
  goldenBoot: PlayerSeasonStats | null;
  goldenGlove: PlayerSeasonStats | null;
  playmaker: PlayerSeasonStats | null;
  userWonBoot: boolean;
  userWonGlove: boolean;
  userWonPlaymaker: boolean;
  highlights: string[];
  verdict: string;
  tacticalRating: number;
  biggestWin: MatchResult | null;
  worstLoss: MatchResult | null;
}

// ───────────────────────────── Vault ─────────────────────────────

export interface VaultEntry {
  id: string;
  savedAt: string;
  grade: Grade;
  managerId: ManagerId;
  formationId: FormationId;
  teamName: string;
  lineup: { slotId: string; cardId: string }[];
  record: { w: number; d: number; l: number; gf: number; ga: number; pts: number; pos: number };
  teamRating: number;
  mvpName: string | null;
  topScorer: { name: string; goals: number } | null;
  invincible: boolean;
}

export interface CareerStats {
  runs: number;
  titles: number;
  invincibles: number;
  perfect38: number;
  bestPoints: number;
  bestGrade: Grade | null;
  gradeCounts: Partial<Record<Grade, number>>;
  totalGoals: number;
}
