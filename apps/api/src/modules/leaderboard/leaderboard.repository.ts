import { listMatches } from '../../database/queries/matches.queries.js';
import {
  listLeaderboardPredictions,
  listLeaderboardUsers
} from '../../database/queries/leaderboard.queries.js';

export function findLeaderboardMatches() {
  return listMatches();
}

export function findLeaderboardPredictions() {
  return listLeaderboardPredictions();
}

export function findLeaderboardUsers() {
  return listLeaderboardUsers();
}
