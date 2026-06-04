import { openDatabase } from '../index.js';

export interface UserRow {
  readonly id: number;
  readonly username: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly password_hash: string;
  readonly role: 'super_admin' | 'admin' | 'user';
}

export interface CreateUserInput {
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly passwordHash: string;
  readonly role: 'user';
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

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const db = await openDatabase();

  try {
    const result = await db.run(
      `
        INSERT INTO users (username, first_name, last_name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `,
      input.username,
      input.firstName,
      input.lastName,
      input.passwordHash,
      input.role
    );

    const user = await db.get<UserRow>(
      `
        SELECT id, username, first_name, last_name, password_hash, role
        FROM users
        WHERE id = ?
      `,
      result.lastID
    );

    if (!user) {
      throw new Error('Created user could not be loaded.');
    }

    return user;
  } finally {
    await db.close();
  }
}
