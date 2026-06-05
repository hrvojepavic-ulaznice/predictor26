import { openDatabase } from '../index.js';

export interface MatchRow {
  readonly id: number;
  readonly match_number: number;
  readonly stage: string;
  readonly group_name: string | null;
  readonly round_label: string;
  readonly kickoff_at: string;
  readonly source_time_zone: string;
  readonly home_team_name: string;
  readonly away_team_name: string;
  readonly home_team_flag: string | null;
  readonly away_team_flag: string | null;
  readonly venue: string;
  readonly city: string;
  readonly final_home_score: number | null;
  readonly final_away_score: number | null;
}

export interface MatchImportInput {
  readonly matchNumber: number;
  readonly stage: string;
  readonly groupName: string | null;
  readonly roundLabel: string;
  readonly kickoffAt: string;
  readonly sourceTimeZone: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeTeamFlag: string | null;
  readonly awayTeamFlag: string | null;
  readonly venue: string;
  readonly city: string;
}

export interface PredictionRow {
  readonly match_id: number;
  readonly home_score: number;
  readonly away_score: number;
}

export function listMatches(): MatchRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            match_number,
            stage,
            group_name,
            round_label,
            kickoff_at,
            source_time_zone,
            home_team_name,
            away_team_name,
            home_team_flag,
            away_team_flag,
            venue,
            city,
            final_home_score,
            final_away_score
          FROM matches
          ORDER BY match_number ASC
        `
      )
      .all() as MatchRow[];
  } finally {
    db.close();
  }
}

export function listMatchesWithPredictions(userId: number): Array<MatchRow & PredictionRowNullable> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            matches.id,
            matches.match_number,
            matches.stage,
            matches.group_name,
            matches.round_label,
            matches.kickoff_at,
            matches.source_time_zone,
            matches.home_team_name,
            matches.away_team_name,
            matches.home_team_flag,
            matches.away_team_flag,
            matches.venue,
            matches.city,
            matches.final_home_score,
            matches.final_away_score,
            predictions.home_score AS prediction_home_score,
            predictions.away_score AS prediction_away_score
          FROM matches
          LEFT JOIN predictions
            ON predictions.match_id = matches.id
            AND predictions.user_id = ?
          ORDER BY matches.match_number ASC
        `
      )
      .all(userId) as Array<MatchRow & PredictionRowNullable>;
  } finally {
    db.close();
  }
}

export function upsertImportedMatches(matches: readonly MatchImportInput[]): number {
  const db = openDatabase();

  try {
    const upsert = db.prepare(
      `
        INSERT INTO matches (
          match_number,
          stage,
          group_name,
          round_label,
          kickoff_at,
          source_time_zone,
          home_team_name,
          away_team_name,
          home_team_flag,
          away_team_flag,
          venue,
          city
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(match_number) DO UPDATE SET
          stage = excluded.stage,
          group_name = excluded.group_name,
          round_label = excluded.round_label,
          kickoff_at = excluded.kickoff_at,
          source_time_zone = excluded.source_time_zone,
          home_team_name = excluded.home_team_name,
          away_team_name = excluded.away_team_name,
          home_team_flag = excluded.home_team_flag,
          away_team_flag = excluded.away_team_flag,
          venue = excluded.venue,
          city = excluded.city,
          imported_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `
    );

    const transaction = db.transaction((items: readonly MatchImportInput[]) => {
      for (const match of items) {
        upsert.run(
          match.matchNumber,
          match.stage,
          match.groupName,
          match.roundLabel,
          match.kickoffAt,
          match.sourceTimeZone,
          match.homeTeamName,
          match.awayTeamName,
          match.homeTeamFlag,
          match.awayTeamFlag,
          match.venue,
          match.city
        );
      }
    });

    transaction(matches);

    return matches.length;
  } finally {
    db.close();
  }
}

export function updateFinalScore(
  matchId: number,
  finalHomeScore: number | null,
  finalAwayScore: number | null
): MatchRow | undefined {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE matches
        SET final_home_score = ?, final_away_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    ).run(finalHomeScore, finalAwayScore, matchId);

    return db
      .prepare(
        `
          SELECT
            id,
            match_number,
            stage,
            group_name,
            round_label,
            kickoff_at,
            source_time_zone,
            home_team_name,
            away_team_name,
            home_team_flag,
            away_team_flag,
            venue,
            city,
            final_home_score,
            final_away_score
          FROM matches
          WHERE id = ?
        `
      )
      .get(matchId) as MatchRow | undefined;
  } finally {
    db.close();
  }
}

export function upsertPrediction(
  userId: number,
  matchId: number,
  homeScore: number,
  awayScore: number
): PredictionRow | undefined {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO predictions (user_id, match_id, home_score, away_score)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, match_id) DO UPDATE SET
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          updated_at = CURRENT_TIMESTAMP
      `
    ).run(userId, matchId, homeScore, awayScore);

    return db
      .prepare(
        `
          SELECT match_id, home_score, away_score
          FROM predictions
          WHERE user_id = ? AND match_id = ?
        `
      )
      .get(userId, matchId) as PredictionRow | undefined;
  } finally {
    db.close();
  }
}

interface PredictionRowNullable {
  readonly prediction_home_score: number | null;
  readonly prediction_away_score: number | null;
}
