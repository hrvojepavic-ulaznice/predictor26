import {
  listMatchesWithPredictions,
  PredictionOddsOutcome,
  upsertPrediction
} from '../../database/queries/matches.queries.js';

export function findMatchesForUser(userId: number) {
  return listMatchesWithPredictions(userId);
}

export function savePrediction(
  userId: number,
  matchId: number,
  homeScore: number,
  awayScore: number,
  oddsOutcome: PredictionOddsOutcome | null,
  oddsValue: number | null,
  oddsSyncedAt: string | null
) {
  return upsertPrediction(userId, matchId, homeScore, awayScore, oddsOutcome, oddsValue, oddsSyncedAt);
}
