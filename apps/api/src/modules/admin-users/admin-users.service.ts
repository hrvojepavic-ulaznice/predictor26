import { UserRow } from '../../database/queries/users.queries.js';
import { AdminUserResponse, AdminUsersResponse, UpdateUserRoleRequest } from './admin-users.interfaces.js';
import { findUsersForAdmin, setUserRole } from './admin-users.repository.js';

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
  if (!Number.isInteger(userId) || userId < 1 || (input?.role !== 'admin' && input?.role !== 'user')) {
    return { status: 'invalid' };
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

function toAdminUserResponse(user: UserRow): AdminUserResponse {
  return {
    id: user.id,
    username: user.username,
    name: user.first_name,
    lastname: user.last_name,
    role: user.role
  };
}
