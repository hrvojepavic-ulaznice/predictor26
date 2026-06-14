import { openDatabase } from '../index.js';

export interface NotificationSubscriptionRow {
  readonly id: number;
  readonly user_id: number;
  readonly endpoint: string;
  readonly subscription_json: string;
  readonly is_enabled: 0 | 1;
}

export interface ReminderCandidateRow {
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
}

export interface NotificationSubscriptionStatsRow {
  readonly total_subscriptions: number;
  readonly active_subscriptions: number;
  readonly disabled_subscriptions: number;
  readonly users_with_active_subscriptions: number;
}

export interface ReminderDeliveryRow {
  readonly user_id: number;
  readonly username: string;
  readonly prediction_round: string;
  readonly reminder_hours: 1 | 9;
  readonly created_at: string;
}

export interface PushSubscriptionInput {
  readonly endpoint: string;
  readonly subscriptionJson: string;
  readonly userAgent: string | null;
}

export function getNotificationSubscriptionStats(): NotificationSubscriptionStatsRow {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            COUNT(*) AS total_subscriptions,
            COALESCE(SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END), 0) AS active_subscriptions,
            COALESCE(SUM(CASE WHEN is_enabled = 0 THEN 1 ELSE 0 END), 0) AS disabled_subscriptions,
            COUNT(DISTINCT CASE WHEN is_enabled = 1 THEN user_id END) AS users_with_active_subscriptions
          FROM notification_subscriptions
        `
      )
      .get() as NotificationSubscriptionStatsRow;
  } finally {
    db.close();
  }
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

export function listRecentReminderDeliveries(limit: number): ReminderDeliveryRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            users.id AS user_id,
            users.username,
            notification_reminder_deliveries.prediction_round,
            notification_reminder_deliveries.reminder_hours,
            notification_reminder_deliveries.created_at
          FROM notification_reminder_deliveries
          INNER JOIN users ON users.id = notification_reminder_deliveries.user_id
          ORDER BY notification_reminder_deliveries.created_at DESC
          LIMIT ?
        `
      )
      .all(limit) as ReminderDeliveryRow[];
  } finally {
    db.close();
  }
}

export function listReminderCandidates(nowIso: string, windowEndIso: string): ReminderCandidateRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          WITH match_rounds AS (
            SELECT
              matches.id AS match_id,
              CASE
                WHEN matches.match_number <= 24 THEN 'Group stage - Round 1'
                WHEN matches.match_number <= 48 THEN 'Group stage - Round 2'
                WHEN matches.match_number <= 72 THEN 'Group stage - Round 3'
                ELSE matches.round_label
              END AS prediction_round,
              matches.kickoff_at
            FROM matches
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
            notification_subscriptions.id AS subscription_id,
            notification_subscriptions.endpoint,
            notification_subscriptions.subscription_json
          FROM users
          INNER JOIN notification_subscriptions
            ON notification_subscriptions.user_id = users.id
            AND notification_subscriptions.is_enabled = 1
          CROSS JOIN round_summaries
          CROSS JOIN reminder_windows
          LEFT JOIN match_rounds
            ON match_rounds.prediction_round = round_summaries.prediction_round
          LEFT JOIN predictions
            ON predictions.user_id = users.id
            AND predictions.match_id = match_rounds.match_id
          LEFT JOIN notification_reminder_deliveries
            ON notification_reminder_deliveries.user_id = users.id
            AND notification_reminder_deliveries.prediction_round = round_summaries.prediction_round
            AND notification_reminder_deliveries.reminder_hours = reminder_windows.reminder_hours
          WHERE notification_reminder_deliveries.id IS NULL
            AND datetime(round_summaries.deadline_at, '-' || reminder_windows.reminder_hours || ' hours') <= datetime(?)
            AND datetime(round_summaries.deadline_at, '-' || reminder_windows.reminder_hours || ' hours') > datetime(?)
            AND datetime(round_summaries.deadline_at) > datetime(?)
          GROUP BY
            users.id,
            users.username,
            round_summaries.prediction_round,
            round_summaries.deadline_at,
            round_summaries.expected_count,
            reminder_windows.reminder_hours,
            notification_subscriptions.id,
            notification_subscriptions.endpoint,
            notification_subscriptions.subscription_json
          ORDER BY round_summaries.deadline_at ASC, reminder_windows.reminder_hours DESC
        `
      )
      .all(nowIso, windowEndIso, nowIso) as ReminderCandidateRow[];
  } finally {
    db.close();
  }
}

export function recordReminderDelivery(userId: number, predictionRound: string, reminderHours: 1 | 9): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO notification_reminder_deliveries (user_id, prediction_round, reminder_hours)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, prediction_round, reminder_hours) DO NOTHING
      `
    ).run(userId, predictionRound, reminderHours);
  } finally {
    db.close();
  }
}
