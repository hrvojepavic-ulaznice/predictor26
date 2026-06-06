import {
  backfillMissingPredictionOdds,
  listMatches,
  MatchOddsInput,
  MatchImportInput,
  updateFinalScore,
  updateMatchOdds,
  upsertImportedMatches
} from '../../database/queries/matches.queries.js';

export function findAdminMatches() {
  return listMatches();
}

export function importMatches(matches: readonly MatchImportInput[]) {
  return upsertImportedMatches(matches);
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
