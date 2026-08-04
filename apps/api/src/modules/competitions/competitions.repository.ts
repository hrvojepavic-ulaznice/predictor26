import {
  createCompetition,
  getCompetitionBySlug,
  getCompetitionForUser,
  getCompetitionById,
  getDefaultCompetition,
  getDefaultCompetitionForUser,
  insertCompetitionUser,
  getCompetitionForAdminUser,
  listCompetitionsForAdminUser,
  listCompetitionCanonicalTeamNames,
  listCompetitionTeams,
  listCompetitionRules,
  listCompetitionsWithLiveScoreSyncEnabled,
  listCompetitionsWithNotificationRemindersEnabled,
  listCompetitionsWithAutoMatchImportEnabled,
  listCompetitions,
  listCompetitionsForUser,
  listRuleTemplates,
  updateCompetitionManagementSettings,
  updateCompetitionJobSettings,
  updateCompetitionTiebreaker
} from '../../database/queries/competitions.queries.js';

export function findCompetitionsForUser(userId: number) {
  return listCompetitionsForUser(userId);
}

export function findCompetitionsForAdmin() {
  return listCompetitions();
}

export function findCompetitionsForAdminUser(userId: number) {
  return listCompetitionsForAdminUser(userId);
}

export function findCompetitionForAdminUser(userId: number, competitionId: number) {
  return getCompetitionForAdminUser(userId, competitionId);
}

export function findCompetitionsWithLiveScoreSyncEnabled() {
  return listCompetitionsWithLiveScoreSyncEnabled();
}

export function findCompetitionsWithNotificationRemindersEnabled() {
  return listCompetitionsWithNotificationRemindersEnabled();
}

export function findCompetitionsWithAutoMatchImportEnabled() {
  return listCompetitionsWithAutoMatchImportEnabled();
}

export function findCompetitionForAdmin(competitionId: number) {
  return getCompetitionById(competitionId);
}

export function findCompetitionBySlug(slug: string) {
  return getCompetitionBySlug(slug);
}

export function findCompetitionForUser(userId: number, competitionId: number) {
  return getCompetitionForUser(userId, competitionId);
}

export function joinCompetitionForUser(userId: number, competitionId: number) {
  return insertCompetitionUser(userId, competitionId);
}

export function findDefaultCompetitionForUser(userId: number) {
  return getDefaultCompetitionForUser(userId);
}

export function findDefaultCompetition() {
  return getDefaultCompetition();
}

export function setCompetitionTiebreaker(userId: number, competitionId: number, tiebreakerName: string) {
  return updateCompetitionTiebreaker(userId, competitionId, tiebreakerName);
}

export function setCompetitionJobSettings(
  competitionId: number,
  settings: {
    readonly scheduleSourceUrl?: string;
    readonly oddsSourceUrl?: string;
    readonly importMatchesWithOddsEnabled?: boolean;
    readonly autoImportMatchesEnabled?: boolean;
    readonly autoImportMatchesWeekday?: number;
    readonly autoImportMatchesTime?: string;
    readonly autoImportMatchesTimeZone?: string;
    readonly notificationRemindersEnabled?: boolean;
    readonly liveScoreSyncEnabled?: boolean;
  }
) {
  return updateCompetitionJobSettings(competitionId, settings);
}

export function findRuleTemplates() {
  return listRuleTemplates();
}

export function findCompetitionRules(competitionId: number) {
  return listCompetitionRules(competitionId);
}

export function findCompetitionTeams(competitionId: number) {
  return listCompetitionTeams(competitionId);
}

export function findCompetitionCanonicalTeamNames(competitionId: number) {
  return listCompetitionCanonicalTeamNames(competitionId);
}

export function addCompetition(input: Parameters<typeof createCompetition>[0]) {
  return createCompetition(input);
}

export function setCompetitionManagementSettings(
  competitionId: number,
  input: Parameters<typeof updateCompetitionManagementSettings>[1]
) {
  return updateCompetitionManagementSettings(competitionId, input);
}
