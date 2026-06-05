import {
  listMatchesWithPredictions,
  upsertPrediction
} from '../../database/queries/matches.queries.js';

export function findMatchesForUser(userId: number) {
  return listMatchesWithPredictions(userId);
}

export function savePrediction(userId: number, matchId: number, homeScore: number, awayScore: number) {
  return upsertPrediction(userId, matchId, homeScore, awayScore);
}
