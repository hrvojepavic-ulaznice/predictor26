import { UserRow } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import {
  AdminUserResponse,
  AdminUsersResponse,
  UpdateUserVerificationRequest,
  UpdateUsernameRequest,
  UpdateUserRoleRequest
} from './admin-users.interfaces.js';
import {
  findSuperAdminForSecretCode,
  findUserByUsernameForAdmin,
  findUserForAdmin,
  findUsersForAdmin,
  setUserVerification,
  setUsername,
  setUserRole
} from './admin-users.repository.js';

const usernameMinLength = 3;
const usernameMaxLength = 40;
const secretCodeMaxLength = 128;

export type UpdateUserRoleResult =
  | {
      readonly status: 'updated';
      readonly user: AdminUserResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'protected_role';
    }
  | {
      readonly status: 'invalid_secret';
    };

export type UpdateUsernameResult =
  | {
      readonly status: 'updated';
      readonly user: AdminUserResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'protected_role';
    }
  | {
      readonly status: 'username_taken';
    }
  | {
      readonly status: 'invalid_secret';
    };

export type UpdateUserVerificationResult =
  | {
      readonly status: 'updated';
      readonly user: AdminUserResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'protected_role';
    }
  | {
      readonly status: 'invalid_secret';
    };

export async function getAdminUsers(): Promise<AdminUsersResponse> {
  const users = await findUsersForAdmin();

  return {
    users: users.map(toAdminUserResponse)
  };
}

export async function changeUserRole(
  userId: number,
  input: Partial<UpdateUserRoleRequest> | undefined
): Promise<UpdateUserRoleResult> {
  if (
    !Number.isInteger(userId) ||
    userId < 1 ||
    (input?.role !== 'admin' && input?.role !== 'user') ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const user = await setUserRole(userId, input.role);

  if (!user) {
    return { status: 'not_found' };
  }

  if (user.role === 'super_admin') {
    return { status: 'protected_role' };
  }

  return {
    status: 'updated',
    user: toAdminUserResponse(user)
  };
}

export async function changeUsername(
  userId: number,
  input: Partial<UpdateUsernameRequest> | undefined
): Promise<UpdateUsernameResult> {
  if (
    !Number.isInteger(userId) ||
    userId < 1 ||
    typeof input?.username !== 'string' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  const username = input.username.trim();

  if (username.length < usernameMinLength || username.length > usernameMaxLength) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const targetUser = await findUserForAdmin(userId);

  if (!targetUser) {
    return { status: 'not_found' };
  }

  if (targetUser.role === 'super_admin') {
    return { status: 'protected_role' };
  }

  const existingUser = await findUserByUsernameForAdmin(username);

  if (existingUser && existingUser.id !== userId) {
    return { status: 'username_taken' };
  }

  const user = await setUsername(userId, username);

  if (!user) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    user: toAdminUserResponse(user)
  };
}

export async function changeUserVerification(
  userId: number,
  input: Partial<UpdateUserVerificationRequest> | undefined
): Promise<UpdateUserVerificationResult> {
  if (
    !Number.isInteger(userId) ||
    userId < 1 ||
    typeof input?.isVerified !== 'boolean' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const targetUser = await findUserForAdmin(userId);

  if (!targetUser) {
    return { status: 'not_found' };
  }

  if (targetUser.role === 'super_admin') {
    return { status: 'protected_role' };
  }

  const user = await setUserVerification(userId, input.isVerified);

  if (!user) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    user: toAdminUserResponse(user)
  };
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await findSuperAdminForSecretCode();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}

function toAdminUserResponse(user: UserRow): AdminUserResponse {
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
