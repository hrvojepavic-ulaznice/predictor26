import { openDatabase } from '../index.js';
import { defaultCompetitionSlug } from '../../shared/constants/default-competition.constants.js';

export interface CompetitionRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly schedule_source_url: string;
  readonly odds_source_url: string;
  readonly notification_reminders_enabled: 0 | 1;
  readonly live_score_sync_enabled: 0 | 1;
  readonly is_archived: 0 | 1;
  readonly is_finished: 0 | 1;
  readonly tiebreaker_name: string | null;
}

const competitionFinishedSelect = `
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM matches
      WHERE matches.competition_id = competitions.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM matches
      WHERE matches.competition_id = competitions.id
        AND (matches.final_home_score IS NULL OR matches.final_away_score IS NULL)
    )
    THEN 1
    ELSE 0
  END AS is_finished
`;

export function listCompetitionsForUser(userId: number): CompetitionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.is_archived,
            ${competitionFinishedSelect},
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          WHERE competition_users.user_id = ?
            AND competitions.is_archived = 0
          ORDER BY competitions.name COLLATE NOCASE ASC
        `
      )
      .all(userId) as CompetitionRow[];
  } finally {
    db.close();
  }
}

export function listCompetitions(): CompetitionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            is_archived,
            ${competitionFinishedSelect},
            NULL AS tiebreaker_name
          FROM competitions
          WHERE is_archived = 0
          ORDER BY name COLLATE NOCASE ASC
        `
      )
      .all() as CompetitionRow[];
  } finally {
    db.close();
  }
}

export function getCompetitionById(competitionId: number): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            is_archived,
            ${competitionFinishedSelect},
            NULL AS tiebreaker_name
          FROM competitions
          WHERE id = ?
            AND is_archived = 0
        `
      )
      .get(competitionId) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function getCompetitionForUser(userId: number, competitionId: number): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.is_archived,
            ${competitionFinishedSelect},
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          WHERE competition_users.user_id = ?
            AND competitions.id = ?
            AND competitions.is_archived = 0
        `
      )
      .get(userId, competitionId) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function getDefaultCompetition(): CompetitionRow {
  const db = openDatabase();

  try {
    const competition = db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            is_archived,
            ${competitionFinishedSelect},
            NULL AS tiebreaker_name
          FROM competitions
          WHERE slug = ?
        `
      )
      .get(defaultCompetitionSlug) as CompetitionRow | undefined;

    if (!competition) {
      throw new Error('Default competition could not be loaded.');
    }

    return competition;
  } finally {
    db.close();
  }
}

export function getDefaultCompetitionForUser(userId: number): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.is_archived,
            ${competitionFinishedSelect},
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          WHERE competition_users.user_id = ?
            AND competitions.slug = ?
            AND competitions.is_archived = 0
        `
      )
      .get(userId, defaultCompetitionSlug) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function updateCompetitionTiebreaker(
  userId: number,
  competitionId: number,
  tiebreakerName: string
): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE competition_users
        SET tiebreaker_name = ?
        WHERE user_id = ?
          AND competition_id = ?
      `
    ).run(tiebreakerName, userId, competitionId);

    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.is_archived,
            ${competitionFinishedSelect},
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          WHERE competition_users.user_id = ?
            AND competitions.id = ?
            AND competitions.is_archived = 0
        `
      )
      .get(userId, competitionId) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function listCompetitionsWithLiveScoreSyncEnabled(): CompetitionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            is_archived,
            ${competitionFinishedSelect},
            NULL AS tiebreaker_name
          FROM competitions
          WHERE is_archived = 0
            AND live_score_sync_enabled = 1
          ORDER BY id ASC
        `
      )
      .all() as CompetitionRow[];
  } finally {
    db.close();
  }
}

export function listCompetitionsWithNotificationRemindersEnabled(): CompetitionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            is_archived,
            ${competitionFinishedSelect},
            NULL AS tiebreaker_name
          FROM competitions
          WHERE is_archived = 0
            AND notification_reminders_enabled = 1
          ORDER BY id ASC
        `
      )
      .all() as CompetitionRow[];
  } finally {
    db.close();
  }
}

export function updateCompetitionJobSettings(
  competitionId: number,
  settings: {
    readonly scheduleSourceUrl?: string;
    readonly oddsSourceUrl?: string;
    readonly notificationRemindersEnabled?: boolean;
    readonly liveScoreSyncEnabled?: boolean;
  }
): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    const existing = getCompetitionById(competitionId);

    if (!existing) {
      return undefined;
    }

    db.prepare(
      `
        UPDATE competitions
        SET
          schedule_source_url = ?,
          odds_source_url = ?,
          notification_reminders_enabled = ?,
          live_score_sync_enabled = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    ).run(
      settings.scheduleSourceUrl ?? existing.schedule_source_url,
      settings.oddsSourceUrl ?? existing.odds_source_url,
      settings.notificationRemindersEnabled === undefined
        ? existing.notification_reminders_enabled
        : settings.notificationRemindersEnabled
          ? 1
          : 0,
      settings.liveScoreSyncEnabled === undefined
        ? existing.live_score_sync_enabled
        : settings.liveScoreSyncEnabled
          ? 1
          : 0,
      competitionId
    );

    return getCompetitionById(competitionId);
  } finally {
    db.close();
  }
}
