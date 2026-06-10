import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

import { config } from '../config/index.js';

export function openDatabase() {
  mkdirSync(dirname(config.databasePath), { recursive: true });

  const db = new Database(config.databasePath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
    VALUES ('schema_version', '7')
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP;
  `);

  ensureUsersTableSupportsTiebreaker(db);
  ensureUsersTableSupportsVerification(db);
  ensureMatchesTableSupportsOdds(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      type TEXT PRIMARY KEY CHECK(type IN ('iban', 'keks', 'revolut', 'cash')),
      value TEXT NOT NULL DEFAULT '' CHECK(length(value) <= 200),
      fast_pay_url TEXT NOT NULL DEFAULT '' CHECK(length(fast_pay_url) <= 500),
      is_enabled INTEGER NOT NULL DEFAULT 0 CHECK(is_enabled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_settings_config (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      show_payment_info INTEGER NOT NULL DEFAULT 0 CHECK(show_payment_info IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_number INTEGER NOT NULL UNIQUE,
      stage TEXT NOT NULL,
      group_name TEXT,
      round_label TEXT NOT NULL,
      kickoff_at TEXT NOT NULL,
      source_time_zone TEXT NOT NULL,
      home_team_name TEXT NOT NULL,
      away_team_name TEXT NOT NULL,
      home_team_flag TEXT,
      away_team_flag TEXT,
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
  `);

  seedPaymentSettings(db);
  seedPaymentSettingsConfig(db);
  ensurePaymentSettingsSupportsFastPayUrl(db);
  ensurePredictionsTableSupportsOddsSnapshot(db);

  db.prepare(
    `
      INSERT INTO users (username, first_name, last_name, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(username) DO NOTHING
    `
  ).run(
    'super_admin',
    'admin',
    'admin',
    'pbkdf2_sha256$120000$cefb6e4c26d72ee420f8fbb8f91950fe$a1f7e2629548c5ec560ab9b775752d373cb183c56a03a387bf9b2d5ee96ebccc',
    'super_admin'
  );

  return db;
}

export type AppDatabase = ReturnType<typeof openDatabase>;

function seedPaymentSettings(db: Database.Database) {
  const rows: Array<{ type: string; isEnabled: 0 | 1 }> = [
    { type: 'iban', isEnabled: 1 },
    { type: 'keks', isEnabled: 1 },
    { type: 'revolut', isEnabled: 1 },
    { type: 'cash', isEnabled: 0 }
  ];

  const statement = db.prepare(
    `
      INSERT INTO payment_settings (type, is_enabled)
      VALUES (?, ?)
      ON CONFLICT(type) DO NOTHING
    `
  );

  for (const row of rows) {
    statement.run(row.type, row.isEnabled);
  }
}

function seedPaymentSettingsConfig(db: Database.Database) {
  db.prepare(
    `
      INSERT INTO payment_settings_config (id, show_payment_info)
      VALUES (1, 0)
      ON CONFLICT(id) DO NOTHING
    `
  ).run();
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
