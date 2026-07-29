import { createAuthToken } from '../../shared/utils/auth-token.js';
import { getUserById, getUserByIdForCompetition, UserRole, UserRow } from '../../database/queries/users.queries.js';
import { hashPassword, verifyPassword } from '../../shared/utils/password.js';
import { areRegistrationsDisabled } from '../competition-settings/competition-settings.service.js';
import { AuthUserResponse, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './auth.interfaces.js';
import { findUserByUsername, insertUser } from './auth.repository.js';

const usernameMinLength = 3;
const usernameMaxLength = 40;
const nameMinLength = 1;
const nameMaxLength = 80;
const passwordMinLength = 8;
const passwordMaxLength = 128;

export type RegisterResult =
  | {
      readonly status: 'created';
      readonly session: RegisterResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'username_taken';
    }
  | {
      readonly status: 'registrations_disabled';
    };

export async function login(credentials: Partial<LoginRequest> | undefined): Promise<LoginResponse | null> {
  if (typeof credentials?.username !== 'string' || typeof credentials.password !== 'string') {
    return null;
  }

  const username = trimUsername(credentials.username);
  const password = credentials.password;

  if (
    username.length < usernameMinLength ||
    username.length > usernameMaxLength ||
    password.length < passwordMinLength ||
    password.length > passwordMaxLength
  ) {
    return null;
  }

  const user = await findUserByUsername(normalizeUsernameForLookup(username));

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return {
    token: createAuthToken({
      userId: user.id,
      username: user.username,
      role: user.role
    }),
    user: toAuthUserResponse(user)
  };
}

export async function getCurrentUser(
  userId: number,
  role: UserRole,
  competitionId: number | null = null
): Promise<AuthUserResponse | null> {
  const user = competitionId === null || role === 'super_admin' ? await getUserById(userId) : await getUserByIdForCompetition(userId, competitionId);

  return user ? toAuthUserResponse(user) : null;
}

export async function register(input: Partial<RegisterRequest> | undefined): Promise<RegisterResult> {
  if (await areRegistrationsDisabled()) {
    return { status: 'registrations_disabled' };
  }

  if (
    typeof input?.username !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.lastname !== 'string' ||
    typeof input.password !== 'string' ||
    input.acceptedRules !== true
  ) {
    return { status: 'invalid' };
  }

  const username = trimUsername(input.username);
  const name = input.name.trim();
  const lastname = input.lastname.trim();
  const password = input.password;

  if (
    username.length < usernameMinLength ||
    username.length > usernameMaxLength ||
    name.length < nameMinLength ||
    name.length > nameMaxLength ||
    lastname.length < nameMinLength ||
    lastname.length > nameMaxLength ||
    password.length < passwordMinLength ||
    password.length > passwordMaxLength
  ) {
    return { status: 'invalid' };
  }

  const existingUser = await findUserByUsername(normalizeUsernameForLookup(username));

  if (existingUser) {
    return { status: 'username_taken' };
  }

  const user = await insertUser({
    username,
    firstName: name,
    lastName: lastname,
    tiebreakerName: null,
    passwordHash: hashPassword(password),
    role: 'user'
  });

  return {
    status: 'created',
    session: {
      token: createAuthToken({
        userId: user.id,
        username: user.username,
        role: user.role
      }),
      user: toAuthUserResponse(user)
    }
  };
}

function toAuthUserResponse(user: UserRow): AuthUserResponse {
  return {
    id: user.id,
    username: user.username,
    name: user.first_name,
    lastname: user.last_name,
    tiebreakerName: user.tiebreaker_name,
    role: user.role,
    isVerified: user.is_verified === 1
  };
}

function trimUsername(username: string): string {
  return username.trim();
}

function normalizeUsernameForLookup(username: string): string {
  return username.trim().toLowerCase();
}
