import { openDatabase } from '../index.js';

export interface NotificationSubscriptionRow {
  readonly id: number;
  readonly user_id: number;
  readonly endpoint: string;
  readonly subscription_json: string;
  readonly is_enabled: 0 | 1;
}

export interface ReminderCandidateRow {
  readonly competition_id: number;
  readonly competition_slug: string;
  readonly user_id: number;
  readonly username: string;
  readonly prediction_round: string;
  readonly deadline_at: string;
  readonly expected_count: number;
  readonly submitted_count: number;
  readonly reminder_hours: 1 | 9;
  readonly subscription_id: number;
  readonly endpoint: string;
  readonly subscription_json: string;
  readonly user_agent: string | null;
}

export interface ReminderDeliveryRow {
  readonly competition_id: number;
  readonly user_id: number;
  readonly username: string;
  readonly prediction_round: string;
  readonly reminder_hours: 1 | 9;
  readonly created_at: string;
}

export interface ReminderAttemptRow {
  readonly competition_id: number;
  readonly user_id: number;
  readonly username: string;
  readonly prediction_round: string;
  readonly reminder_hours: 1 | 9;
  readonly subscription_id: number | null;
  readonly user_agent: string | null;
  readonly status: 'accepted' | 'failed' | 'disabled';
  readonly status_code: number | null;
  readonly error_message: string | null;
  readonly created_at: string;
}

export interface PushSubscriptionInput {
  readonly endpoint: string;
  readonly subscriptionJson: string;
  readonly userAgent: string | null;
}

export interface ReminderAttemptInput {
  readonly competitionId: number;
  readonly userId: number;
  readonly subscriptionId: number;
  readonly predictionRound: string;
  readonly reminderHours: 1 | 9;
  readonly status: 'accepted' | 'failed' | 'disabled';
  readonly statusCode: number | null;
  readonly errorMessage: string | null;
}

export function upsertNotificationSubscription(userId: number, input: PushSubscriptionInput): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO notification_subscriptions (user_id, endpoint, subscription_json, user_agent, is_enabled)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(endpoint) DO UPDATE SET
          user_id = excluded.user_id,
          subscription_json = excluded.subscription_json,
          user_agent = excluded.user_agent,
          is_enabled = 1,
          updated_at = CURRENT_TIMESTAMP
      `
    ).run(userId, input.endpoint, input.subscriptionJson, input.userAgent);
  } finally {
    db.close();
  }
}

export function disableNotificationSubscription(endpoint: string): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE notification_subscriptions
        SET is_enabled = 0, updated_at = CURRENT_TIMESTAMP
        WHERE endpoint = ?
      `
    ).run(endpoint);
  } finally {
    db.close();
  }
}

export function disableNotificationSubscriptionsForUser(userId: number): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE notification_subscriptions
        SET is_enabled = 0, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `
    ).run(userId);
  } finally {
    db.close();
  }
}

export function listNotificationSubscriptionsForUser(userId: number): NotificationSubscriptionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            user_id,
            endpoint,
            subscription_json,
            is_enabled
          FROM notification_subscriptions
          WHERE user_id = ?
            AND is_enabled = 1
          ORDER BY created_at ASC
        `
      )
      .all(userId) as NotificationSubscriptionRow[];
  } finally {
    db.close();
  }
}

export function listRecentReminderDeliveries(competitionId: number, limit: number): ReminderDeliveryRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            notification_reminder_deliveries.competition_id,
            users.id AS user_id,
            users.username,
            notification_reminder_deliveries.prediction_round,
            notification_reminder_deliveries.reminder_hours,
            notification_reminder_deliveries.created_at
          FROM notification_reminder_deliveries
          INNER JOIN users ON users.id = notification_reminder_deliveries.user_id
          WHERE notification_reminder_deliveries.competition_id = ?
          ORDER BY notification_reminder_deliveries.created_at DESC
          LIMIT ?
        `
      )
      .all(competitionId, limit) as ReminderDeliveryRow[];
  } finally {
    db.close();
  }
}

export function listRecentReminderAttempts(competitionId: number, limit: number): ReminderAttemptRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            notification_reminder_attempts.competition_id,
            users.id AS user_id,
            users.username,
            notification_reminder_attempts.prediction_round,
            notification_reminder_attempts.reminder_hours,
            notification_reminder_attempts.subscription_id,
            notification_subscriptions.user_agent,
            notification_reminder_attempts.status,
            notification_reminder_attempts.status_code,
            notification_reminder_attempts.error_message,
            notification_reminder_attempts.created_at
          FROM notification_reminder_attempts
          INNER JOIN users ON users.id = notification_reminder_attempts.user_id
          LEFT JOIN notification_subscriptions ON notification_subscriptions.id = notification_reminder_attempts.subscription_id
          WHERE notification_reminder_attempts.competition_id = ?
          ORDER BY notification_reminder_attempts.created_at DESC
          LIMIT ?
        `
      )
      .all(competitionId, limit) as ReminderAttemptRow[];
  } finally {
    db.close();
  }
}

export function listReminderCandidates(competitionId: number): ReminderCandidateRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          WITH match_rounds AS (
            SELECT
              matches.id AS match_id,
              CASE
                WHEN matches.round_label LIKE 'Week %' THEN matches.round_label
                WHEN matches.match_number <= 24 THEN 'Group stage - Round 1'
                WHEN matches.match_number <= 48 THEN 'Group stage - Round 2'
                WHEN matches.match_number <= 72 THEN 'Group stage - Round 3'
                ELSE matches.round_label
              END AS prediction_round,
              matches.kickoff_at
            FROM matches
            WHERE matches.competition_id = ?
          ),
          round_summaries AS (
            SELECT
              prediction_round,
              MIN(kickoff_at) AS deadline_at,
              COUNT(*) AS expected_count
            FROM match_rounds
            GROUP BY prediction_round
          ),
          reminder_windows AS (
            SELECT 9 AS reminder_hours
            UNION ALL
            SELECT 1 AS reminder_hours
          )
          SELECT
            users.id AS user_id,
            users.username,
            round_summaries.prediction_round,
            round_summaries.deadline_at,
            round_summaries.expected_count,
            COUNT(predictions.id) AS submitted_count,
            reminder_windows.reminder_hours,
            ? AS competition_id,
            competitions.slug AS competition_slug,
            notification_subscriptions.id AS subscription_id,
            notification_subscriptions.endpoint,
            notification_subscriptions.subscription_json,
            notification_subscriptions.user_agent
          FROM users
          INNER JOIN competitions ON competitions.id = ?
          INNER JOIN notification_subscriptions
            ON notification_subscriptions.user_id = users.id
            AND notification_subscriptions.is_enabled = 1
          INNER JOIN competition_users
            ON competition_users.user_id = users.id
            AND competition_users.competition_id = ?
            AND competition_users.is_verified = 1
          CROSS JOIN round_summaries
          CROSS JOIN reminder_windows
          LEFT JOIN match_rounds
            ON match_rounds.prediction_round = round_summaries.prediction_round
          LEFT JOIN predictions
            ON predictions.user_id = users.id
            AND predictions.match_id = match_rounds.match_id
          LEFT JOIN notification_reminder_deliveries
            ON notification_reminder_deliveries.user_id = users.id
            AND notification_reminder_deliveries.competition_id = ?
            AND notification_reminder_deliveries.prediction_round = round_summaries.prediction_round
            AND notification_reminder_deliveries.reminder_hours = reminder_windows.reminder_hours
          WHERE notification_reminder_deliveries.id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM notification_reminder_deliveries processed_deliveries
              WHERE processed_deliveries.competition_id = ?
                AND processed_deliveries.user_id = users.id
                AND processed_deliveries.prediction_round = round_summaries.prediction_round
                AND processed_deliveries.reminder_hours = reminder_windows.reminder_hours
            )
            AND NOT EXISTS (
              SELECT 1
              FROM notification_reminder_attempts processed_attempts
              WHERE processed_attempts.competition_id = ?
                AND processed_attempts.user_id = users.id
                AND processed_attempts.prediction_round = round_summaries.prediction_round
                AND processed_attempts.reminder_hours = reminder_windows.reminder_hours
            )
          GROUP BY
            users.id,
            users.username,
            round_summaries.prediction_round,
            round_summaries.deadline_at,
            round_summaries.expected_count,
            reminder_windows.reminder_hours,
            competitions.slug,
            notification_subscriptions.id,
            notification_subscriptions.endpoint,
            notification_subscriptions.subscription_json,
            notification_subscriptions.user_agent
          ORDER BY round_summaries.deadline_at ASC, reminder_windows.reminder_hours DESC
        `
      )
      .all(competitionId, competitionId, competitionId, competitionId, competitionId, competitionId, competitionId) as ReminderCandidateRow[];
  } finally {
    db.close();
  }
}

export function recordReminderDelivery(competitionId: number, userId: number, predictionRound: string, reminderHours: 1 | 9): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO notification_reminder_deliveries (competition_id, user_id, prediction_round, reminder_hours)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(competition_id, user_id, prediction_round, reminder_hours) DO NOTHING
      `
    ).run(competitionId, userId, predictionRound, reminderHours);
  } finally {
    db.close();
  }
}

export function recordReminderAttempt(input: ReminderAttemptInput): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO notification_reminder_attempts (
          user_id,
          competition_id,
          subscription_id,
          prediction_round,
          reminder_hours,
          status,
          status_code,
          error_message
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.userId,
      input.competitionId,
      input.subscriptionId,
      input.predictionRound,
      input.reminderHours,
      input.status,
      input.statusCode,
      input.errorMessage
    );
  } finally {
    db.close();
  }
}
