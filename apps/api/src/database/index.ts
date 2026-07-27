import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

import { config } from '../config/index.js';
import {
  defaultCompetitionName,
  defaultCompetitionSlug,
  defaultScheduleSourceUrl,
  defaultOddsPortalSourceUrl
} from '../shared/constants/default-competition.constants.js';
import { hashPassword } from '../shared/utils/password.js';

let databaseInitialized = false;

export function openDatabase() {
  mkdirSync(dirname(config.databasePath), { recursive: true });

  const db = new Database(config.databasePath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (databaseInitialized) {
    return db;
  }

  initializeDatabase(db);
  databaseInitialized = true;

  return db;
}

export type AppDatabase = ReturnType<typeof openDatabase>;

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureUsersTableSupportsAdminRole(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 40),
      first_name TEXT NOT NULL CHECK(length(first_name) BETWEEN 1 AND 80),
      last_name TEXT NOT NULL CHECK(length(last_name) BETWEEN 1 AND 80),
      tiebreaker_name TEXT CHECK(tiebreaker_name IS NULL OR length(tiebreaker_name) BETWEEN 1 AND 80),
      password_hash TEXT NOT NULL CHECK(length(password_hash) <= 255),
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user')),
      is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO app_metadata (key, value)
    VALUES ('schema_version', '8')
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP;
  `);

  ensureUsersTableSupportsTiebreaker(db);
  ensureUsersTableSupportsVerification(db);
  ensureCompetitionSchema(db);
  ensureMatchesTableSupportsOdds(db);
  ensureMatchesTableSupportsPlayoffMappings(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('iban', 'keks', 'revolut', 'cash')),
      value TEXT NOT NULL DEFAULT '' CHECK(length(value) <= 200),
      fast_pay_url TEXT NOT NULL DEFAULT '' CHECK(length(fast_pay_url) <= 500),
      is_enabled INTEGER NOT NULL DEFAULT 0 CHECK(is_enabled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (competition_id, type)
    );

    CREATE TABLE IF NOT EXISTS payment_settings_config (
      competition_id INTEGER PRIMARY KEY REFERENCES competitions(id) ON DELETE CASCADE,
      show_payment_info INTEGER NOT NULL DEFAULT 0 CHECK(show_payment_info IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      match_number INTEGER NOT NULL,
      stage TEXT NOT NULL,
      group_name TEXT,
      round_label TEXT NOT NULL,
      kickoff_at TEXT NOT NULL,
      source_time_zone TEXT NOT NULL,
      home_team_name TEXT NOT NULL,
      away_team_name TEXT NOT NULL,
      home_team_flag TEXT,
      away_team_flag TEXT,
      home_mapped_team_name TEXT,
      away_mapped_team_name TEXT,
      home_mapped_team_flag TEXT,
      away_mapped_team_flag TEXT,
      venue TEXT NOT NULL,
      city TEXT NOT NULL,
      home_win_odds REAL CHECK(home_win_odds IS NULL OR home_win_odds > 1),
      draw_odds REAL CHECK(draw_odds IS NULL OR draw_odds > 1),
      away_win_odds REAL CHECK(away_win_odds IS NULL OR away_win_odds > 1),
      odds_synced_at TEXT,
      final_home_score INTEGER CHECK(final_home_score IS NULL OR final_home_score >= 0),
      final_away_score INTEGER CHECK(final_away_score IS NULL OR final_away_score >= 0),
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      home_score INTEGER NOT NULL CHECK(home_score >= 0),
      away_score INTEGER NOT NULL CHECK(away_score >= 0),
      odds_outcome TEXT CHECK(odds_outcome IS NULL OR odds_outcome IN ('1', 'X', '2')),
      odds_value REAL CHECK(odds_value IS NULL OR odds_value > 1),
      odds_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS notification_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      subscription_json TEXT NOT NULL,
      user_agent TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_reminder_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prediction_round TEXT NOT NULL,
      reminder_hours INTEGER NOT NULL CHECK(reminder_hours IN (1, 9)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(competition_id, user_id, prediction_round, reminder_hours)
    );

    CREATE TABLE IF NOT EXISTS notification_reminder_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id INTEGER REFERENCES notification_subscriptions(id) ON DELETE SET NULL,
      prediction_round TEXT NOT NULL,
      reminder_hours INTEGER NOT NULL CHECK(reminder_hours IN (1, 9)),
      status TEXT NOT NULL CHECK(status IN ('accepted', 'failed', 'disabled')),
      status_code INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_score_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_event_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('scheduled', 'live', 'finished', 'unknown')),
      raw_status TEXT,
      home_score INTEGER CHECK(home_score IS NULL OR home_score >= 0),
      away_score INTEGER CHECK(away_score IS NULL OR away_score >= 0),
      raw_payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_score_job_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'skipped', 'failed')),
      checked_matches INTEGER NOT NULL DEFAULT 0,
      updated_matches INTEGER NOT NULL DEFAULT 0,
      live_matches INTEGER NOT NULL DEFAULT 0,
      finished_matches INTEGER NOT NULL DEFAULT 0,
      next_run_at TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS live_score_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER REFERENCES live_score_job_runs(id) ON DELETE SET NULL,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      previous_home_score INTEGER,
      previous_away_score INTEGER,
      new_home_score INTEGER NOT NULL,
      new_away_score INTEGER NOT NULL,
      provider_status TEXT NOT NULL,
      applied_to_final_score INTEGER NOT NULL DEFAULT 1 CHECK(applied_to_final_score IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultCompetition(db);
  ensureCompetitionScopedIndexes(db);

  seedPaymentSettings(db);
  seedPaymentSettingsConfig(db);

  // Older compatibility migrations. These are not specific to the competition layer.
  ensurePaymentSettingsSupportsFastPayUrl(db);
  ensurePredictionsTableSupportsOddsSnapshot(db);
  ensureNotificationReminderDeliveriesSupportsOneHour(db);

  seedSuperAdmin(db);
}

function ensureCompetitionSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE CHECK(length(name) BETWEEN 1 AND 120),
      slug TEXT NOT NULL UNIQUE CHECK(length(slug) BETWEEN 1 AND 140),
      schedule_source_url TEXT NOT NULL DEFAULT '' CHECK(length(schedule_source_url) <= 500),
      odds_source_url TEXT NOT NULL DEFAULT '' CHECK(length(odds_source_url) <= 500),
      notification_reminders_enabled INTEGER NOT NULL DEFAULT 0 CHECK(notification_reminders_enabled IN (0, 1)),
      live_score_sync_enabled INTEGER NOT NULL DEFAULT 0 CHECK(live_score_sync_enabled IN (0, 1)),
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS competition_users (
      competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
      tiebreaker_name TEXT CHECK(tiebreaker_name IS NULL OR length(tiebreaker_name) BETWEEN 1 AND 80),
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (competition_id, user_id)
    );
  `);
}

function seedDefaultCompetition(db: Database.Database) {
  db.prepare(
    `
      INSERT INTO competitions (name, slug, schedule_source_url, odds_source_url, live_score_sync_enabled)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        schedule_source_url = CASE
          WHEN competitions.schedule_source_url = '' THEN excluded.schedule_source_url
          ELSE competitions.schedule_source_url
        END,
        odds_source_url = CASE
          WHEN competitions.odds_source_url = '' THEN excluded.odds_source_url
          ELSE competitions.odds_source_url
        END,
        live_score_sync_enabled = competitions.live_score_sync_enabled,
        updated_at = CURRENT_TIMESTAMP
    `
  ).run(defaultCompetitionName, defaultCompetitionSlug, defaultScheduleSourceUrl, defaultOddsPortalSourceUrl);
}

function getDefaultCompetitionId(db: Database.Database): number {
  const competition = db
    .prepare('SELECT id FROM competitions WHERE slug = ?')
    .get(defaultCompetitionSlug) as { id: number } | undefined;

  if (!competition) {
    throw new Error(`${defaultCompetitionName} competition could not be loaded.`);
  }

  return competition.id;
}

function seedPaymentSettings(db: Database.Database) {
  const defaultCompetitionId = getDefaultCompetitionId(db);
  const rows: Array<{ type: string; isEnabled: 0 | 1 }> = [
    { type: 'iban', isEnabled: 1 },
    { type: 'keks', isEnabled: 1 },
    { type: 'revolut', isEnabled: 1 },
    { type: 'cash', isEnabled: 0 }
  ];

  const statement = db.prepare(
    `
      INSERT INTO payment_settings (competition_id, type, is_enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(competition_id, type) DO NOTHING
    `
  );

  for (const row of rows) {
    statement.run(defaultCompetitionId, row.type, row.isEnabled);
  }
}

function seedPaymentSettingsConfig(db: Database.Database) {
  const defaultCompetitionId = getDefaultCompetitionId(db);

  db.prepare(
    `
      INSERT INTO payment_settings_config (competition_id, show_payment_info)
      VALUES (?, 0)
      ON CONFLICT(competition_id) DO NOTHING
    `
  ).run(defaultCompetitionId);
}

function seedSuperAdmin(db: Database.Database) {
  const existingSuperAdmin = db
    .prepare("SELECT id FROM users WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1")
    .get() as { id: number } | undefined;

  if (existingSuperAdmin) {
    return;
  }

  if (!config.superAdminPassword) {
    if (config.nodeEnv === 'production') {
      throw new Error('SUPER_ADMIN_PASSWORD is required to bootstrap the first super admin.');
    }

    console.warn('SUPER_ADMIN_PASSWORD is missing. Skipping development super admin bootstrap.');
    return;
  }

  db.prepare(
    `
      INSERT INTO users (username, first_name, last_name, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(username) DO NOTHING
    `
  ).run(
    config.superAdminUsername,
    config.superAdminFirstName,
    config.superAdminLastName,
    hashPassword(config.superAdminPassword),
    'super_admin'
  );
}

function ensurePaymentSettingsSupportsFastPayUrl(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(payment_settings)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columns.length === 0 || columnNames.has('fast_pay_url')) {
    return;
  }

  db.exec("ALTER TABLE payment_settings ADD COLUMN fast_pay_url TEXT NOT NULL DEFAULT '' CHECK(length(fast_pay_url) <= 500)");
}

function ensureUsersTableSupportsAdminRole(db: Database.Database) {
  const existingTable = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get() as { sql: string } | undefined;

  if (!existingTable || existingTable.sql.includes("'admin'")) {
    return;
  }

  db.exec(`
    PRAGMA foreign_keys = OFF;

    BEGIN TRANSACTION;

    CREATE TABLE users_next (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 40),
      first_name TEXT NOT NULL CHECK(length(first_name) BETWEEN 1 AND 80),
      last_name TEXT NOT NULL CHECK(length(last_name) BETWEEN 1 AND 80),
      tiebreaker_name TEXT CHECK(tiebreaker_name IS NULL OR length(tiebreaker_name) BETWEEN 1 AND 80),
      password_hash TEXT NOT NULL CHECK(length(password_hash) <= 255),
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO users_next (
      id,
      username,
      first_name,
      last_name,
      tiebreaker_name,
      password_hash,
      role,
      created_at,
      updated_at
    )
    SELECT
      id,
      username,
      first_name,
      last_name,
      NULL,
      password_hash,
      role,
      created_at,
      updated_at
    FROM users;

    DROP TABLE users;
    ALTER TABLE users_next RENAME TO users;

    COMMIT;

    PRAGMA foreign_keys = ON;
  `);
}

function ensureUsersTableSupportsTiebreaker(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columns.length === 0 || columnNames.has('tiebreaker_name')) {
    return;
  }

  db.exec(
    'ALTER TABLE users ADD COLUMN tiebreaker_name TEXT CHECK(tiebreaker_name IS NULL OR length(tiebreaker_name) BETWEEN 1 AND 80)'
  );
}

function ensureUsersTableSupportsVerification(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columns.length === 0 || columnNames.has('is_verified')) {
    return;
  }

  db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1))');
}

function ensureMatchesTableSupportsOdds(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(matches)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columns.length === 0) {
    return;
  }

  if (!columnNames.has('home_win_odds')) {
    db.exec('ALTER TABLE matches ADD COLUMN home_win_odds REAL CHECK(home_win_odds IS NULL OR home_win_odds > 1)');
  }

  if (!columnNames.has('draw_odds')) {
    db.exec('ALTER TABLE matches ADD COLUMN draw_odds REAL CHECK(draw_odds IS NULL OR draw_odds > 1)');
  }

  if (!columnNames.has('away_win_odds')) {
    db.exec('ALTER TABLE matches ADD COLUMN away_win_odds REAL CHECK(away_win_odds IS NULL OR away_win_odds > 1)');
  }

  if (!columnNames.has('odds_synced_at')) {
    db.exec('ALTER TABLE matches ADD COLUMN odds_synced_at TEXT');
  }
}

function ensureMatchesTableSupportsPlayoffMappings(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(matches)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columns.length === 0) {
    return;
  }

  if (!columnNames.has('home_mapped_team_name')) {
    db.exec('ALTER TABLE matches ADD COLUMN home_mapped_team_name TEXT');
  }

  if (!columnNames.has('away_mapped_team_name')) {
    db.exec('ALTER TABLE matches ADD COLUMN away_mapped_team_name TEXT');
  }

  if (!columnNames.has('home_mapped_team_flag')) {
    db.exec('ALTER TABLE matches ADD COLUMN home_mapped_team_flag TEXT');
  }

  if (!columnNames.has('away_mapped_team_flag')) {
    db.exec('ALTER TABLE matches ADD COLUMN away_mapped_team_flag TEXT');
  }
}

function ensurePredictionsTableSupportsOddsSnapshot(db: Database.Database) {
  const columns = db.prepare('PRAGMA table_info(predictions)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columns.length === 0) {
    return;
  }

  if (!columnNames.has('odds_outcome')) {
    db.exec("ALTER TABLE predictions ADD COLUMN odds_outcome TEXT CHECK(odds_outcome IS NULL OR odds_outcome IN ('1', 'X', '2'))");
  }

  if (!columnNames.has('odds_value')) {
    db.exec('ALTER TABLE predictions ADD COLUMN odds_value REAL CHECK(odds_value IS NULL OR odds_value > 1)');
  }

  if (!columnNames.has('odds_synced_at')) {
    db.exec('ALTER TABLE predictions ADD COLUMN odds_synced_at TEXT');
  }
}

function ensureNotificationReminderDeliveriesSupportsOneHour(db: Database.Database) {
  const existingTable = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notification_reminder_deliveries'")
    .get() as { sql: string } | undefined;

  if (!existingTable || existingTable.sql.includes('reminder_hours IN (1, 9)')) {
    return;
  }

  db.exec(`
    PRAGMA foreign_keys = OFF;

    BEGIN TRANSACTION;

    CREATE TABLE notification_reminder_deliveries_next (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prediction_round TEXT NOT NULL,
      reminder_hours INTEGER NOT NULL CHECK(reminder_hours IN (1, 9)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, prediction_round, reminder_hours)
    );

    INSERT INTO notification_reminder_deliveries_next (id, user_id, prediction_round, reminder_hours, created_at)
    SELECT id, user_id, prediction_round, reminder_hours, created_at
    FROM notification_reminder_deliveries
    WHERE reminder_hours IN (1, 9);

    DROP TABLE notification_reminder_deliveries;
    ALTER TABLE notification_reminder_deliveries_next RENAME TO notification_reminder_deliveries;

    COMMIT;

    PRAGMA foreign_keys = ON;
  `);
}

function ensureCompetitionScopedIndexes(db: Database.Database) {
  const matchColumns = db.prepare('PRAGMA table_info(matches)').all() as Array<{ name: string }>;
  const matchColumnNames = new Set(matchColumns.map((column) => column.name));
  const liveScoreColumns = db.prepare('PRAGMA table_info(live_score_job_runs)').all() as Array<{ name: string }>;
  const liveScoreColumnNames = new Set(liveScoreColumns.map((column) => column.name));
  const reminderAttemptColumns = db.prepare('PRAGMA table_info(notification_reminder_attempts)').all() as Array<{ name: string }>;
  const reminderAttemptColumnNames = new Set(reminderAttemptColumns.map((column) => column.name));

  if (matchColumnNames.has('competition_id')) {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS matches_competition_match_number_unique ON matches(competition_id, match_number)');
    db.exec('CREATE INDEX IF NOT EXISTS matches_competition_id_index ON matches(competition_id)');
  }

  if (liveScoreColumnNames.has('competition_id')) {
    db.exec('CREATE INDEX IF NOT EXISTS live_score_job_runs_competition_id_index ON live_score_job_runs(competition_id)');
  }

  if (reminderAttemptColumnNames.has('competition_id')) {
    db.exec('CREATE INDEX IF NOT EXISTS notification_reminder_attempts_competition_id_index ON notification_reminder_attempts(competition_id)');
  }
}
