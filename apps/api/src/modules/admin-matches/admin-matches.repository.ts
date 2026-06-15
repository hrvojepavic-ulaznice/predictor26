import {
  backfillMissingPredictionOdds,
  clearFinalScoresBeforeKickoff,
  deleteMatchesAfterMatchNumber,
  deletePredictionsBeforeKickoff,
  listMatches,
  MatchOddsInput,
  MatchImportInput,
  updateFinalScore,
  updateMatchKickoff,
  updateMatchOdds,
  updatePlayoffTeamMapping,
  upsertImportedMatches
} from '../../database/queries/matches.queries.js';
import { getAppMetadataValue, setAppMetadataValue } from '../../database/queries/app-metadata.queries.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';

export function findAdminMatches() {
  return listMatches();
}

export async function findSuperAdminForSecretCode() {
  return getSuperAdminUser();
}

export function importMatches(matches: readonly MatchImportInput[]) {
  return upsertImportedMatches(matches);
}

export function pruneMatchesAfter(matchNumber: number) {
  return deleteMatchesAfterMatchNumber(matchNumber);
}

export async function getMetadataValue(key: string) {
  return getAppMetadataValue(key);
}

export function setMetadataValue(key: string, value: string) {
  setAppMetadataValue(key, value);
}

export function clearPendingFinalScores(nowIso: string) {
  return clearFinalScoresBeforeKickoff(nowIso);
}

export function clearPendingPredictions(nowIso: string) {
  return deletePredictionsBeforeKickoff(nowIso);
}

export function setFinalScore(matchId: number, homeScore: number | null, awayScore: number | null) {
  return updateFinalScore(matchId, homeScore, awayScore);
}

export function setKickoff(matchId: number, kickoffAt: string) {
  return updateMatchKickoff(matchId, kickoffAt);
}

export function setPlayoffTeamMapping(matchId: number, side: 'home' | 'away', teamName: string | null, teamFlag: string | null) {
  return updatePlayoffTeamMapping(matchId, side, teamName, teamFlag);
}

export function setMatchOdds(odds: readonly MatchOddsInput[]) {
  return updateMatchOdds(odds);
}

export function backfillPredictionOdds() {
  return backfillMissingPredictionOdds();
}
