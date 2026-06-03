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

    INSERT INTO app_metadata (key, value)
    VALUES ('schema_version', '1')
    ON CONFLICT(key) DO NOTHING;
  `);

  return db;
}
