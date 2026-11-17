import { computeTeamRating } from './chemistry';
import { buildLeague, LEAGUE_ERAS, SeasonSim, USER_TEAM_ID, type LeagueEraId } from './seasonSimulator';
import type { FormationId, Lineup, ManagerId } from '../types/game';

export interface ReplayResult {
  eraId: LeagueEraId;
  eraName: string;
  position: number;
  points: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  topScorer: { name: string; goals: number } | null;
}

/** Play a whole season instantly (no broadcast, no touchline calls) for a saved team in a chosen era. */
export function replaySeason(opts: { teamName: string; formationId: FormationId; lineup: Lineup; managerId: ManagerId | null; eraId: LeagueEraId }): ReplayResult {
  const { teamName, formationId, lineup, eraId } = opts;
  // A Best XI has no manager: it plays without any manager bonus.
  const managerId = (opts.managerId ?? 'none') as ManagerId;
  const rating = computeTeamRating(formationId, lineup, opts.managerId);
  const sim = new SeasonSim(buildLeague({ teamName, formationId, lineup, rating, managerId, era: eraId }), managerId, rating, Math.random, eraId);
  while (!sim.done) {
    sim.checkDecision();
    sim.playMatchweek();
  }
  const row = sim.table[USER_TEAM_ID];
  const top = sim.leaders('goals', 60).find((p) => p.isUser) ?? null;
  return {
    eraId,
    eraName: LEAGUE_ERAS[eraId].name,
    position: sim.userPosition(),
    points: row.points,
    w: row.won,
    d: row.drawn,
    l: row.lost,
    gf: row.gf,
    ga: row.ga,
    topScorer: top ? { name: top.name, goals: top.goals } : null,
  };
}
