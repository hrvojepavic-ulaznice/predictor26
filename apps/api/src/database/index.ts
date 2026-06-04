import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { config } from '../config/index.js';

export async function openDatabase() {
  mkdirSync(dirname(config.databasePath), { recursive: true });

  const db = await open({
    filename: config.databasePath,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA journal_mode = WAL');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureUsersTableSupportsAdminRole(db);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 40),
      first_name TEXT NOT NULL CHECK(length(first_name) BETWEEN 1 AND 80),
      last_name TEXT NOT NULL CHECK(length(last_name) BETWEEN 1 AND 80),
      password_hash TEXT NOT NULL CHECK(length(password_hash) <= 255),
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO app_metadata (key, value)
    VALUES ('schema_version', '3')
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP;
  `);

  await db.run(
    `
      INSERT INTO users (username, first_name, last_name, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(username) DO NOTHING
    `,
    'super_admin',
    'admin',
    'admin',
    'pbkdf2_sha256$120000$cefb6e4c26d72ee420f8fbb8f91950fe$a1f7e2629548c5ec560ab9b775752d373cb183c56a03a387bf9b2d5ee96ebccc',
    'super_admin'
  );

  return db;
}

async function ensureUsersTableSupportsAdminRole(db: Awaited<ReturnType<typeof open>>) {
  const existingTable = await db.get<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
  );

  if (!existingTable || existingTable.sql.includes("'admin'")) {
    return;
  }

  await db.exec(`
    PRAGMA foreign_keys = OFF;

    BEGIN TRANSACTION;

    CREATE TABLE users_next (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 40),
      first_name TEXT NOT NULL CHECK(length(first_name) BETWEEN 1 AND 80),
      last_name TEXT NOT NULL CHECK(length(last_name) BETWEEN 1 AND 80),
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
