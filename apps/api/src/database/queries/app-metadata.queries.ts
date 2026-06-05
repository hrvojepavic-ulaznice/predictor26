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
