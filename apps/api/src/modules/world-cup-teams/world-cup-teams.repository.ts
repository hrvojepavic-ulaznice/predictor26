import { listDistinctMatchTeamNames, listGroupTeams } from '../../database/queries/matches.queries.js';

export function findWorldCupTeamNames(): string[] {
  return listDistinctMatchTeamNames();
}

export function findWorldCupGroupTeams() {
  return listGroupTeams();
}
