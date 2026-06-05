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
  const db = openDatabase();

  try {
    return db
      .prepare(
      `
        SELECT id, username, first_name, last_name, password_hash, role
        FROM users
        WHERE username = ?
      `
      )
      .get(username) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const db = openDatabase();

  try {
    const result = db
      .prepare(
      `
        INSERT INTO users (username, first_name, last_name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .run(
      input.username,
      input.firstName,
      input.lastName,
      input.passwordHash,
      input.role
    );

    const user = db
      .prepare(
      `
        SELECT id, username, first_name, last_name, password_hash, role
        FROM users
        WHERE id = ?
      `
      )
      .get(result.lastInsertRowid) as UserRow | undefined;

    if (!user) {
      throw new Error('Created user could not be loaded.');
    }

    return user;
  } finally {
    db.close();
  }
}
