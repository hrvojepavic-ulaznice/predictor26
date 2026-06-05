import { listUsers, updateUserRole, UserRole } from '../../database/queries/users.queries.js';

export async function findUsersForAdmin() {
  return listUsers();
}

export async function setUserRole(userId: number, role: Exclude<UserRole, 'super_admin'>) {
  return updateUserRole(userId, role);
}
