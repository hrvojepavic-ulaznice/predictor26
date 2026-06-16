import { openDatabase } from '../index.js';
import { PredictionOddsOutcome } from './matches.queries.js';

export interface LeaderboardUserRow {
  readonly id: number;
  readonly username: string;
  readonly tiebreaker_name: string | null;
}

export interface LeaderboardPredictionRow {
  readonly user_id: number;
  readonly match_id: number;
  readonly match_number: number;
  readonly group_name: string | null;
  readonly round_label: string;
  readonly final_home_score: number | null;
  readonly final_away_score: number | null;
  readonly prediction_home_score: number;
  readonly prediction_away_score: number;
  readonly prediction_odds_outcome: PredictionOddsOutcome | null;
  readonly prediction_odds_value: number | null;
}

export function listLeaderboardUsers(): LeaderboardUserRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT id, username, tiebreaker_name
          FROM users
          WHERE role != 'super_admin'
          ORDER BY username COLLATE NOCASE ASC
        `
      )
      .all() as LeaderboardUserRow[];
  } finally {
    db.close();
  }
}

export function listLeaderboardPredictions(): LeaderboardPredictionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            predictions.user_id,
            matches.id AS match_id,
            matches.match_number,
            matches.group_name,
            matches.round_label,
            matches.final_home_score,
            matches.final_away_score,
            predictions.home_score AS prediction_home_score,
            predictions.away_score AS prediction_away_score,
            predictions.odds_outcome AS prediction_odds_outcome,
            predictions.odds_value AS prediction_odds_value
          FROM predictions
          INNER JOIN matches ON matches.id = predictions.match_id
          INNER JOIN users ON users.id = predictions.user_id
          WHERE users.role != 'super_admin'
          ORDER BY matches.match_number ASC
        `
      )
      .all() as LeaderboardPredictionRow[];
  } finally {
    db.close();
  }
}
