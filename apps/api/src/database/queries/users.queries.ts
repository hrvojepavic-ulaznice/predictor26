import { openDatabase } from '../index.js';

export interface UserRow {
  readonly id: number;
  readonly username: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly tiebreaker_name: string | null;
  readonly password_hash: string;
  readonly role: 'super_admin' | 'admin' | 'user';
  readonly is_verified: 0 | 1;
}

export type UserRole = UserRow['role'];

export interface CreateUserInput {
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly tiebreakerName: string | null;
  readonly passwordHash: string;
  readonly role: 'user';
}

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    return db
      .prepare(
      `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
        FROM users
        WHERE username = ? COLLATE NOCASE
      `
      )
      .get(username) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
        FROM users
        WHERE id = ?
      `
      )
      .get(id) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function getUserByIdForCompetition(id: number, competitionId: number): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT
          users.id,
          users.username,
          users.first_name,
          users.last_name,
          competition_users.tiebreaker_name,
          users.password_hash,
          competition_users.role,
          competition_users.is_verified
        FROM users
        INNER JOIN competition_users ON competition_users.user_id = users.id
        WHERE users.id = ?
          AND competition_users.competition_id = ?
          AND users.role != 'super_admin'
      `
      )
      .get(id, competitionId) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function listUsers(): Promise<UserRow[]> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
        FROM users
        ORDER BY username COLLATE NOCASE ASC
      `
      )
      .all() as UserRow[];
  } finally {
    db.close();
  }
}

export async function listUsersForCompetition(competitionId: number): Promise<UserRow[]> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT
          users.id,
          users.username,
          users.first_name,
          users.last_name,
          competition_users.tiebreaker_name,
          users.password_hash,
          competition_users.role,
          competition_users.is_verified
        FROM users
        INNER JOIN competition_users ON competition_users.user_id = users.id
        WHERE users.role != 'super_admin'
          AND competition_users.competition_id = ?
        ORDER BY users.username COLLATE NOCASE ASC
      `
      )
      .all(competitionId) as UserRow[];
  } finally {
    db.close();
  }
}

export async function getSuperAdminUser(): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
        FROM users
        WHERE role = 'super_admin'
        ORDER BY id ASC
        LIMIT 1
      `
      )
      .get() as UserRow | undefined;
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
        INSERT INTO users (username, first_name, last_name, tiebreaker_name, password_hash, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(
      input.username,
      input.firstName,
      input.lastName,
      input.tiebreakerName,
      input.passwordHash,
      input.role
    );

    const user = db
      .prepare(
      `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
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

export async function updateUserCompetitionRole(id: number, competitionId: number, role: Exclude<UserRole, 'super_admin'>): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE competition_users
        SET role = ?
        WHERE user_id = ?
          AND competition_id = ?
          AND EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = competition_users.user_id
              AND users.role != 'super_admin'
          )
      `
    ).run(role, id, competitionId);

    return db
      .prepare(
        `
        SELECT
          users.id,
          users.username,
          users.first_name,
          users.last_name,
          competition_users.tiebreaker_name,
          users.password_hash,
          competition_users.role,
          competition_users.is_verified
        FROM users
        INNER JOIN competition_users ON competition_users.user_id = users.id
        WHERE users.id = ?
          AND competition_users.competition_id = ?
      `
      )
      .get(id, competitionId) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function updateUsername(id: number, username: string): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE users
        SET username = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND role != 'super_admin'
      `
    ).run(username, id);

    return db
      .prepare(
        `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
        FROM users
        WHERE id = ?
      `
      )
      .get(id) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function updateUserVerification(id: number, isVerified: boolean): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE users
        SET is_verified = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND role != 'super_admin'
      `
    ).run(isVerified ? 1 : 0, id);

    return db
      .prepare(
        `
        SELECT id, username, first_name, last_name, tiebreaker_name, password_hash, role, is_verified
        FROM users
        WHERE id = ?
      `
      )
      .get(id) as UserRow | undefined;
  } finally {
    db.close();
  }
}

export async function updateUserVerificationForCompetition(
  id: number,
  competitionId: number,
  isVerified: boolean
): Promise<UserRow | undefined> {
  const db = openDatabase();

  try {
    db.prepare(
      `
        UPDATE competition_users
        SET is_verified = ?
        WHERE user_id = ?
          AND competition_id = ?
          AND EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = competition_users.user_id
              AND users.role != 'super_admin'
          )
      `
    ).run(isVerified ? 1 : 0, id, competitionId);

    return db
      .prepare(
        `
        SELECT
          users.id,
          users.username,
          users.first_name,
          users.last_name,
          competition_users.tiebreaker_name,
          users.password_hash,
          competition_users.role,
          competition_users.is_verified
        FROM users
        INNER JOIN competition_users ON competition_users.user_id = users.id
        WHERE users.id = ?
          AND competition_users.competition_id = ?
      `
      )
      .get(id, competitionId) as UserRow | undefined;
  } finally {
    db.close();
  }
}
