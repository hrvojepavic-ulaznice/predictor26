import { openDatabase } from '../index.js';
import { defaultCompetitionSlug } from '../../shared/constants/default-competition.constants.js';

export interface CompetitionRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly passcode_hash: string | null;
  readonly logo_url: string;
  readonly schedule_source_url: string;
  readonly odds_source_url: string;
  readonly notification_reminders_enabled: 0 | 1;
  readonly live_score_sync_enabled: 0 | 1;
  readonly playoffs_enabled: 0 | 1;
  readonly is_archived: 0 | 1;
  readonly is_finished: 0 | 1;
  readonly is_joined: 0 | 1;
  readonly tiebreaker_name: string | null;
}

export interface RuleTemplateRow {
  readonly key: string;
  readonly text_template: string;
  readonly value_label: string | null;
  readonly default_value: string | null;
  readonly sort_order: number;
}

export interface CompetitionRuleRow extends RuleTemplateRow {
  readonly value: string | null;
}

export interface CompetitionTeamRow {
  readonly name: string;
  readonly logoUrl: string | null;
  readonly groupName: string | null;
}

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
            competitions.passcode_hash,
            competitions.logo_url,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.playoffs_enabled,
            competitions.is_archived,
            competitions.is_finished,
            CASE WHEN competition_users.user_id IS NULL THEN 0 ELSE 1 END AS is_joined,
            competition_users.tiebreaker_name
          FROM competitions
          LEFT JOIN competition_users
            ON competition_users.competition_id = competitions.id
            AND competition_users.user_id = ?
          LEFT JOIN users
            ON users.id = competition_users.user_id
            AND users.role != 'super_admin'
          WHERE competitions.is_archived = 0
            AND (
              (competition_users.user_id IS NOT NULL AND users.id IS NOT NULL)
              OR competitions.is_finished = 0
            )
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
            passcode_hash,
            logo_url,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            playoffs_enabled,
            is_archived,
            is_finished,
            1 AS is_joined,
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

export function listCompetitionsForAdminUser(userId: number): CompetitionRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.passcode_hash,
            competitions.logo_url,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.playoffs_enabled,
            competitions.is_archived,
            competitions.is_finished,
            1 AS is_joined,
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          INNER JOIN users ON users.id = competition_users.user_id
          WHERE competition_users.user_id = ?
            AND competition_users.role = 'admin'
            AND users.role != 'super_admin'
            AND competitions.is_archived = 0
          ORDER BY competitions.name COLLATE NOCASE ASC
        `
      )
      .all(userId) as CompetitionRow[];
  } finally {
    db.close();
  }
}

export function getCompetitionForAdminUser(userId: number, competitionId: number): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.passcode_hash,
            competitions.logo_url,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.playoffs_enabled,
            competitions.is_archived,
            competitions.is_finished,
            1 AS is_joined,
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          INNER JOIN users ON users.id = competition_users.user_id
          WHERE competition_users.user_id = ?
            AND competitions.id = ?
            AND competition_users.role = 'admin'
            AND users.role != 'super_admin'
            AND competitions.is_archived = 0
        `
      )
      .get(userId, competitionId) as CompetitionRow | undefined;
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
            passcode_hash,
            logo_url,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            playoffs_enabled,
            is_archived,
            is_finished,
            1 AS is_joined,
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
            competitions.passcode_hash,
            competitions.logo_url,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.playoffs_enabled,
            competitions.is_archived,
            competitions.is_finished,
            CASE WHEN competition_users.user_id IS NULL THEN 0 ELSE 1 END AS is_joined,
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          INNER JOIN users ON users.id = competition_users.user_id
          WHERE competition_users.user_id = ?
            AND competitions.id = ?
            AND users.role != 'super_admin'
            AND competitions.is_archived = 0
        `
      )
      .get(userId, competitionId) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function getDefaultCompetition(): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            passcode_hash,
            logo_url,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            playoffs_enabled,
            is_archived,
            is_finished,
            1 AS is_joined,
            NULL AS tiebreaker_name
          FROM competitions
          WHERE slug = ?
        `
      )
      .get(defaultCompetitionSlug) as CompetitionRow | undefined;
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
            competitions.passcode_hash,
            competitions.logo_url,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.playoffs_enabled,
            competitions.is_archived,
            competitions.is_finished,
            1 AS is_joined,
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          INNER JOIN users ON users.id = competition_users.user_id
          WHERE competition_users.user_id = ?
            AND competitions.slug = ?
            AND users.role != 'super_admin'
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
          AND EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = competition_users.user_id
              AND users.role != 'super_admin'
          )
      `
    ).run(tiebreakerName, userId, competitionId);

    return db
      .prepare(
        `
          SELECT
            competitions.id,
            competitions.name,
            competitions.slug,
            competitions.passcode_hash,
            competitions.logo_url,
            competitions.schedule_source_url,
            competitions.odds_source_url,
            competitions.notification_reminders_enabled,
            competitions.live_score_sync_enabled,
            competitions.playoffs_enabled,
            competitions.is_archived,
            competitions.is_finished,
            1 AS is_joined,
            competition_users.tiebreaker_name
          FROM competitions
          INNER JOIN competition_users ON competition_users.competition_id = competitions.id
          INNER JOIN users ON users.id = competition_users.user_id
          WHERE competition_users.user_id = ?
            AND competitions.id = ?
            AND users.role != 'super_admin'
            AND competitions.is_archived = 0
        `
      )
      .get(userId, competitionId) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function insertCompetitionUser(userId: number, competitionId: number): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO competition_users (competition_id, user_id)
        VALUES (?, ?)
        ON CONFLICT(competition_id, user_id) DO NOTHING
      `
    ).run(competitionId, userId);

    return getCompetitionForUser(userId, competitionId);
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
            passcode_hash,
            logo_url,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            playoffs_enabled,
            is_archived,
            is_finished,
            1 AS is_joined,
            NULL AS tiebreaker_name
          FROM competitions
          WHERE is_archived = 0
            AND is_finished = 0
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
            passcode_hash,
            logo_url,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            playoffs_enabled,
            is_archived,
            is_finished,
            1 AS is_joined,
            NULL AS tiebreaker_name
          FROM competitions
          WHERE is_archived = 0
            AND is_finished = 0
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

    const notificationRemindersEnabled =
      existing.is_finished === 1
        ? 0
        : settings.notificationRemindersEnabled === undefined
          ? existing.notification_reminders_enabled
          : settings.notificationRemindersEnabled
            ? 1
            : 0;
    const liveScoreSyncEnabled =
      existing.is_finished === 1
        ? 0
        : settings.liveScoreSyncEnabled === undefined
          ? existing.live_score_sync_enabled
          : settings.liveScoreSyncEnabled
            ? 1
            : 0;

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
      notificationRemindersEnabled,
      liveScoreSyncEnabled,
      competitionId
    );

    return getCompetitionById(competitionId);
  } finally {
    db.close();
  }
}

export function getCompetitionBySlug(slug: string): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            passcode_hash,
            logo_url,
            schedule_source_url,
            odds_source_url,
            notification_reminders_enabled,
            live_score_sync_enabled,
            playoffs_enabled,
            is_archived,
            is_finished,
            1 AS is_joined,
            NULL AS tiebreaker_name
          FROM competitions
          WHERE slug = ?
            AND is_archived = 0
        `
      )
      .get(slug) as CompetitionRow | undefined;
  } finally {
    db.close();
  }
}

export function listRuleTemplates(): RuleTemplateRow[] {
  const db = openDatabase();

  try {
    return db.prepare('SELECT key, text_template, value_label, default_value, sort_order FROM rule_templates ORDER BY sort_order ASC').all() as RuleTemplateRow[];
  } finally {
    db.close();
  }
}

export function listCompetitionRules(competitionId: number): CompetitionRuleRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT
            rule_templates.key,
            rule_templates.text_template,
            rule_templates.value_label,
            rule_templates.default_value,
            competition_rules.value,
            competition_rules.sort_order
          FROM competition_rules
          INNER JOIN rule_templates ON rule_templates.key = competition_rules.template_key
          WHERE competition_rules.competition_id = ?
          ORDER BY competition_rules.sort_order ASC
        `
      )
      .all(competitionId) as CompetitionRuleRow[];
  } finally {
    db.close();
  }
}

export function listCompetitionTeams(competitionId: number): CompetitionTeamRow[] {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
          SELECT display_name AS name, NULLIF(logo_url, '') AS logoUrl, group_name AS groupName
          FROM competition_teams
          WHERE competition_id = ?
          ORDER BY display_name COLLATE NOCASE ASC
        `
      )
      .all(competitionId) as CompetitionTeamRow[];
  } finally {
    db.close();
  }
}

export function createCompetition(input: {
  readonly name: string;
  readonly slug: string;
  readonly passcodeHash: string;
  readonly logoUrl: string;
  readonly isFinished: boolean;
  readonly playoffsEnabled: boolean;
  readonly scheduleSourceUrl: string;
  readonly oddsSourceUrl: string;
  readonly rules: ReadonlyArray<{ readonly templateKey: string; readonly value: string | null; readonly sortOrder: number }>;
}): CompetitionRow {
  const db = openDatabase();

  try {
    const transaction = db.transaction(() => {
      const result = db
        .prepare(
          `
            INSERT INTO competitions (
              name,
              slug,
              passcode_hash,
              logo_url,
              is_finished,
              schedule_source_url,
              odds_source_url,
              notification_reminders_enabled,
              live_score_sync_enabled,
              playoffs_enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
          `
        )
        .run(
          input.name,
          input.slug,
          input.passcodeHash,
          input.logoUrl,
          input.isFinished ? 1 : 0,
          input.scheduleSourceUrl,
          input.oddsSourceUrl,
          input.playoffsEnabled ? 1 : 0
        );
      const competitionId = Number(result.lastInsertRowid);

      insertDefaultPaymentSettings(db, competitionId);
      replaceCompetitionRulesInDatabase(db, competitionId, input.rules);

      return competitionId;
    });

    return getCompetitionById(transaction())!;
  } finally {
    db.close();
  }
}

export function updateCompetitionManagementSettings(
  competitionId: number,
  input: {
    readonly name: string;
    readonly slug: string;
    readonly passcodeHash?: string;
    readonly logoUrl: string;
    readonly isFinished: boolean;
    readonly playoffsEnabled: boolean;
    readonly scheduleSourceUrl: string;
    readonly oddsSourceUrl: string;
    readonly rules: ReadonlyArray<{ readonly templateKey: string; readonly value: string | null; readonly sortOrder: number }>;
  }
): CompetitionRow | undefined {
  const db = openDatabase();

  try {
    const existing = getCompetitionById(competitionId);

    if (!existing) {
      return undefined;
    }

    const transaction = db.transaction(() => {
      if (input.passcodeHash) {
        db.prepare(
          `
            UPDATE competitions
            SET
              name = ?,
              slug = ?,
              passcode_hash = ?,
              logo_url = ?,
              is_finished = ?,
              playoffs_enabled = ?,
              schedule_source_url = ?,
              odds_source_url = ?,
              notification_reminders_enabled = ?,
              live_score_sync_enabled = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `
        ).run(
          input.name,
          input.slug,
          input.passcodeHash,
          input.logoUrl,
          input.isFinished ? 1 : 0,
          input.playoffsEnabled ? 1 : 0,
          input.scheduleSourceUrl,
          input.oddsSourceUrl,
          input.isFinished ? 0 : existing.notification_reminders_enabled,
          input.isFinished ? 0 : existing.live_score_sync_enabled,
          competitionId
        );
      } else {
        db.prepare(
          `
            UPDATE competitions
            SET
              name = ?,
              slug = ?,
              logo_url = ?,
              is_finished = ?,
              playoffs_enabled = ?,
              schedule_source_url = ?,
              odds_source_url = ?,
              notification_reminders_enabled = ?,
              live_score_sync_enabled = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `
        ).run(
          input.name,
          input.slug,
          input.logoUrl,
          input.isFinished ? 1 : 0,
          input.playoffsEnabled ? 1 : 0,
          input.scheduleSourceUrl,
          input.oddsSourceUrl,
          input.isFinished ? 0 : existing.notification_reminders_enabled,
          input.isFinished ? 0 : existing.live_score_sync_enabled,
          competitionId
        );
      }

      replaceCompetitionRulesInDatabase(db, competitionId, input.rules);
    });

    transaction();

    return getCompetitionById(competitionId);
  } finally {
    db.close();
  }
}

function insertDefaultPaymentSettings(db: ReturnType<typeof openDatabase>, competitionId: number): void {
  const settings = [
    { type: 'iban', isEnabled: 1 },
    { type: 'keks', isEnabled: 1 },
    { type: 'revolut', isEnabled: 1 },
    { type: 'cash', isEnabled: 0 }
  ] as const;
  const settingStatement = db.prepare(
    `
      INSERT INTO payment_settings (competition_id, type, is_enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(competition_id, type) DO NOTHING
    `
  );

  for (const setting of settings) {
    settingStatement.run(competitionId, setting.type, setting.isEnabled);
  }

  db.prepare(
    `
      INSERT INTO payment_settings_config (competition_id, show_payment_info)
      VALUES (?, 0)
      ON CONFLICT(competition_id) DO NOTHING
    `
  ).run(competitionId);
}

function replaceCompetitionRulesInDatabase(
  db: ReturnType<typeof openDatabase>,
  competitionId: number,
  rules: ReadonlyArray<{ readonly templateKey: string; readonly value: string | null; readonly sortOrder: number }>
): void {
  db.prepare('DELETE FROM competition_rules WHERE competition_id = ?').run(competitionId);

  const statement = db.prepare(
    `
      INSERT INTO competition_rules (competition_id, template_key, value, sort_order)
      VALUES (?, ?, ?, ?)
    `
  );

  for (const rule of rules) {
    statement.run(competitionId, rule.templateKey, rule.value, rule.sortOrder);
  }
}
