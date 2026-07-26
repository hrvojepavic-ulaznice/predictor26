import {
  listMatchesWithPredictions,
  listPredictedMatchesWithPredictions,
  PredictionOddsOutcome,
  upsertPrediction
} from '../../database/queries/matches.queries.js';

export function findMatchesForUser(userId: number, competitionId: number) {
  return listMatchesWithPredictions(userId, competitionId);
}

export function findPredictedMatchesForUser(userId: number, competitionId: number) {
  return listPredictedMatchesWithPredictions(userId, competitionId);
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
