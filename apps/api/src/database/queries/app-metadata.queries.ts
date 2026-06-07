import { openDatabase } from '../index.js';

export async function getAppMetadataValue(key: string): Promise<string | undefined> {
  const db = openDatabase();

  try {
    const row = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get(key) as
      | { value: string }
      | undefined;

    return row?.value;
  } finally {
    db.close();
  }
}

export function setAppMetadataValue(key: string, value: string): void {
  const db = openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO app_metadata (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `
    ).run(key, value);
  } finally {
    db.close();
  }
}
