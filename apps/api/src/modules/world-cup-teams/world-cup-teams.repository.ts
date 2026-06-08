import { listDistinctMatchTeamNames } from '../../database/queries/matches.queries.js';

export function findWorldCupTeamNames(): string[] {
  return listDistinctMatchTeamNames();
}
