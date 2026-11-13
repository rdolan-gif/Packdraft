import type { CareerStats, Grade, VaultEntry } from '../types/game';

const VAULT_KEY = 'pd38_vault_v1';
const CAREER_KEY = 'pd38_career_v1';

const GRADE_RANK: Record<Grade, number> = { 'S+': 7, S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: vault stays in-memory for this visit */
  }
}

export function loadVault(): VaultEntry[] {
  return read<VaultEntry[]>(VAULT_KEY, []);
}

export function saveToVault(entry: VaultEntry): VaultEntry[] {
  const v = [entry, ...loadVault().filter((e) => e.id !== entry.id)].slice(0, 60);
  write(VAULT_KEY, v);
  return v;
}

export function deleteFromVault(id: string): VaultEntry[] {
  const v = loadVault().filter((e) => e.id !== id);
  write(VAULT_KEY, v);
  return v;
}

export const EMPTY_CAREER: CareerStats = {
  runs: 0,
  titles: 0,
  invincibles: 0,
  perfect38: 0,
  bestPoints: 0,
  bestGrade: null,
  gradeCounts: {},
  totalGoals: 0,
};

export function loadCareer(): CareerStats {
  return { ...EMPTY_CAREER, ...read<CareerStats>(CAREER_KEY, EMPTY_CAREER) };
}

export function recordRun(r: { grade: Grade; position: number; lost: number; won: number; points: number; gf: number }): CareerStats {
  const c = loadCareer();
  const next: CareerStats = {
    runs: c.runs + 1,
    titles: c.titles + (r.position === 1 ? 1 : 0),
    invincibles: c.invincibles + (r.position === 1 && r.lost === 0 ? 1 : 0),
    perfect38: c.perfect38 + (r.won === 38 ? 1 : 0),
    bestPoints: Math.max(c.bestPoints, r.points),
    bestGrade: !c.bestGrade || GRADE_RANK[r.grade] > GRADE_RANK[c.bestGrade] ? r.grade : c.bestGrade,
    gradeCounts: { ...c.gradeCounts, [r.grade]: (c.gradeCounts[r.grade] ?? 0) + 1 },
    totalGoals: c.totalGoals + r.gf,
  };
  write(CAREER_KEY, next);
  return next;
}

/** League titles (any grade), S/S+ runs and unbeaten seasons go in the vault. */
export function qualifiesForVault(grade: Grade, lost: number, position: number) {
  return position === 1 || grade === 'S' || grade === 'S+' || lost === 0;
}
