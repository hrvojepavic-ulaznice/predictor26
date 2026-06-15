import { openDatabase } from '../index.js';

export type LiveScoreStatus = 'scheduled' | 'live' | 'finished' | 'unknown';
export type LiveScoreJobRunStatus = 'success' | 'skipped' | 'failed';

export interface LiveScoreSnapshotInput {
  readonly matchId: number;
  readonly provider: string;
  readonly providerEventId: string | null;
  readonly status: LiveScoreStatus;
  readonly rawStatus: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly rawPayloadJson: string;
  readonly fetchedAt: string;
}

export interface LiveScoreJobRunInput {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly status: LiveScoreJobRunStatus;
  readonly checkedMatches: number;
  readonly updatedMatches: number;
  readonly liveMatches: number;
  readonly finishedMatches: number;
  readonly nextRunAt: string | null;
  readonly errorMessage: string | null;
}

export interface LiveScoreJobRunRow {
  readonly id: number;
  readonly started_at: string;
  readonly finished_at: string;
  readonly status: LiveScoreJobRunStatus;
  readonly checked_matches: number;
  readonly updated_matches: number;
  readonly live_matches: number;
  readonly finished_matches: number;
  readonly next_run_at: string | null;
  readonly error_message: string | null;
}

export interface LiveScoreUpdateInput {
  readonly runId: number | null;
  readonly matchId: number;
  readonly previousHomeScore: number | null;
  readonly previousAwayScore: number | null;
  readonly newHomeScore: number;
  readonly newAwayScore: number;
  readonly providerStatus: LiveScoreStatus;
  readonly appliedToFinalScore: boolean;
  readonly createdAt: string;
}

export interface LiveScoreUpdateRow {
  readonly id: number;
  readonly run_id: number | null;
  readonly match_id: number;
  readonly match_number: number;
  readonly home_team_name: string;
  readonly away_team_name: string;
  readonly previous_home_score: number | null;
  readonly previous_away_score: number | null;
  readonly new_home_score: number;
  readonly new_away_score: number;
  readonly provider_status: LiveScoreStatus;
  readonly applied_to_final_score: 0 | 1;
  readonly created_at: string;
}

export interface LatestLiveScoreSnapshotRow {
  readonly match_id: number;
  readonly provider: string;
  readonly provider_event_id: string | null;
  readonly status: LiveScoreStatus;
  readonly raw_status: string | null;
  readonly home_score: number | null;
  readonly away_score: number | null;
  readonly fetched_at: string;
}

export function insertLiveScoreSnapshot(input: LiveScoreSnapshotInput): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO live_score_snapshots (
          match_id,
          provider,
          provider_event_id,
          status,
          raw_status,
          home_score,
          away_score,
          raw_payload_json,
          fetched_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.matchId,
      input.provider,
      input.providerEventId,
      input.status,
      input.rawStatus,
      input.homeScore,
      input.awayScore,
      input.rawPayloadJson,
      input.fetchedAt
    );
  } finally {
    db.close();
  }
}

export function insertLiveScoreJobRun(input: LiveScoreJobRunInput): number {
  const db = openDatabase();

  try {
    const result = db
      .prepare(
        `
          INSERT INTO live_score_job_runs (
            started_at,
            finished_at,
            status,
            checked_matches,
            updated_matches,
            live_matches,
            finished_matches,
            next_run_at,
            error_message
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        input.startedAt,
        input.finishedAt,
        input.status,
        input.checkedMatches,
        input.updatedMatches,
        input.liveMatches,
        input.finishedMatches,
        input.nextRunAt,
        input.errorMessage
      );

    return Number(result.lastInsertRowid);
  } finally {
    db.close();
  }
}

export function insertLiveScoreUpdate(input: LiveScoreUpdateInput): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO live_score_updates (
          run_id,
          match_id,
          previous_home_score,
          previous_away_score,
          new_home_score,
          new_away_score,
          provider_status,
          applied_to_final_score,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.runId,
      input.matchId,
      input.previousHomeScore,
      input.previousAwayScore,
      input.newHomeScore,
      input.newAwayScore,
      input.providerStatus,
      input.appliedToFinalScore ? 1 : 0,
      input.createdAt
    );
  } finally {
    db.close();
  }
}

export function getLatestLiveScoreJobRun(): LiveScoreJobRunRow | null {
  const db = openDatabase();

  try {
    return (
      (db
        .prepare(
          `
            SELECT
              id,
              started_at,
              finished_at,
              status,
              checked_matches,
              updated_matches,
              live_matches,
              finished_matches,
              next_run_at,
              error_message
            FROM live_score_job_runs
            ORDER BY started_at DESC
            LIMIT 1
          `
        )
        .get() as LiveScoreJobRunRow | undefined) ?? null
    );
  } finally {
    db.close();
  }
}

export function listRecentLiveScoreJobRuns(limit: number): LiveScoreJobRunRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            started_at,
            finished_at,
            status,
            checked_matches,
            updated_matches,
            live_matches,
            finished_matches,
            next_run_at,
            error_message
          FROM live_score_job_runs
          ORDER BY started_at DESC
          LIMIT ?
        `
      )
      .all(limit) as LiveScoreJobRunRow[];
  } finally {
    db.close();
  }
}

export function listRecentLiveScoreUpdates(limit: number): LiveScoreUpdateRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            live_score_updates.id,
            live_score_updates.run_id,
            live_score_updates.match_id,
            matches.match_number,
            COALESCE(matches.home_mapped_team_name, matches.home_team_name) AS home_team_name,
            COALESCE(matches.away_mapped_team_name, matches.away_team_name) AS away_team_name,
            live_score_updates.previous_home_score,
            live_score_updates.previous_away_score,
            live_score_updates.new_home_score,
            live_score_updates.new_away_score,
            live_score_updates.provider_status,
            live_score_updates.applied_to_final_score,
            live_score_updates.created_at
          FROM live_score_updates
          INNER JOIN matches ON matches.id = live_score_updates.match_id
          ORDER BY live_score_updates.created_at DESC
          LIMIT ?
        `
      )
      .all(limit) as LiveScoreUpdateRow[];
  } finally {
    db.close();
  }
}

export function listLatestLiveScoreSnapshots(): LatestLiveScoreSnapshotRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            snapshots.match_id,
            snapshots.provider,
            snapshots.provider_event_id,
            snapshots.status,
            snapshots.raw_status,
            snapshots.home_score,
            snapshots.away_score,
            snapshots.fetched_at
          FROM live_score_snapshots snapshots
          INNER JOIN (
            SELECT match_id, MAX(fetched_at) AS fetched_at
            FROM live_score_snapshots
            GROUP BY match_id
          ) latest
            ON latest.match_id = snapshots.match_id
            AND latest.fetched_at = snapshots.fetched_at
          ORDER BY snapshots.fetched_at DESC
        `
      )
      .all() as LatestLiveScoreSnapshotRow[];
  } finally {
    db.close();
  }
}
