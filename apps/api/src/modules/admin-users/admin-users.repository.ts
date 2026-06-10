import {
  getSuperAdminUser,
  getUserById,
  getUserByUsername,
  listUsers,
  updateUserVerification,
  updateUsername,
  updateUserRole,
  UserRole
} from '../../database/queries/users.queries.js';

export async function findUsersForAdmin() {
  return listUsers();
}

export async function findSuperAdminForSecretCode() {
  return getSuperAdminUser();
}

export async function findUserForAdmin(userId: number) {
  return getUserById(userId);
}

export async function findUserByUsernameForAdmin(username: string) {
  return getUserByUsername(username);
}

export async function setUserRole(userId: number, role: Exclude<UserRole, 'super_admin'>) {
  return updateUserRole(userId, role);
}

export async function setUsername(userId: number, username: string) {
  return updateUsername(userId, username);
}

export async function setUserVerification(userId: number, isVerified: boolean) {
  return updateUserVerification(userId, isVerified);
}
