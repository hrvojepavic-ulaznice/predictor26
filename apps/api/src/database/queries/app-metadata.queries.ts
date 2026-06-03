import { openDatabase } from '../index.js';

export async function getAppMetadataValue(key: string): Promise<string | undefined> {
  const db = await openDatabase();

  try {
    const row = await db.get<{ value: string }>('SELECT value FROM app_metadata WHERE key = ?', key);

    return row?.value;
  } finally {
    await db.close();
  }
}
