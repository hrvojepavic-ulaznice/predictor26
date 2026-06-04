import { openDatabase } from '../index.js';

export interface UserRow {
  readonly id: number;
  readonly username: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly password_hash: string;
  readonly role: 'super_admin' | 'admin' | 'user';
}

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  const db = await openDatabase();

  try {
    return await db.get<UserRow>(
      `
        SELECT id, username, first_name, last_name, password_hash, role
        FROM users
        WHERE username = ?
      `,
      username
    );
  } finally {
    await db.close();
  }
}
