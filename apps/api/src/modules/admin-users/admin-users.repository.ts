import {
  getSuperAdminUser,
  getUserById,
  getUserByIdForCompetition,
  getUserByUsername,
  listUsersForCompetition,
  listUsers,
  updateUserVerificationForCompetition,
  updateUserVerification,
  updateUsername,
  updateUserCompetitionRole,
  UserRole
} from '../../database/queries/users.queries.js';

export async function findUsersForAdmin() {
  return listUsers();
}

export async function findUsersForCompetitionAdmin(competitionId: number) {
  return listUsersForCompetition(competitionId);
}

export async function findSuperAdminForSecretCode() {
  return getSuperAdminUser();
}

export async function findUserForAdmin(userId: number) {
  return getUserById(userId);
}

export async function findUserForCompetitionAdmin(userId: number, competitionId: number) {
  return getUserByIdForCompetition(userId, competitionId);
}

export async function findUserByUsernameForAdmin(username: string) {
  return getUserByUsername(username);
}

export async function setUserRole(userId: number, competitionId: number, role: Exclude<UserRole, 'super_admin'>) {
  return updateUserCompetitionRole(userId, competitionId, role);
}

export async function setUsername(userId: number, username: string) {
  return updateUsername(userId, username);
}

export async function setUserVerification(userId: number, isVerified: boolean) {
  return updateUserVerification(userId, isVerified);
}

export async function setUserCompetitionVerification(userId: number, competitionId: number, isVerified: boolean) {
  return updateUserVerificationForCompetition(userId, competitionId, isVerified);
}
