import {
  backfillMissingPredictionOdds,
  clearFinalScoresBeforeKickoff,
  deleteMatchesAfterMatchNumber,
  listMatches,
  MatchOddsInput,
  MatchImportInput,
  updateFinalScore,
  updateMatchOdds,
  upsertImportedMatches
} from '../../database/queries/matches.queries.js';
import { getAppMetadataValue, setAppMetadataValue } from '../../database/queries/app-metadata.queries.js';

export function findAdminMatches() {
  return listMatches();
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

export function setFinalScore(matchId: number, homeScore: number | null, awayScore: number | null) {
  return updateFinalScore(matchId, homeScore, awayScore);
}

export function setMatchOdds(odds: readonly MatchOddsInput[]) {
  return updateMatchOdds(odds);
}

export function backfillPredictionOdds() {
  return backfillMissingPredictionOdds();
}
