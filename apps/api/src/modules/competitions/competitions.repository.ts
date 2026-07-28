import {
  createCompetition,
  getCompetitionBySlug,
  getCompetitionForUser,
  getCompetitionById,
  getDefaultCompetition,
  getDefaultCompetitionForUser,
  insertCompetitionUser,
  listCompetitionRules,
  listCompetitionsWithLiveScoreSyncEnabled,
  listCompetitionsWithNotificationRemindersEnabled,
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

export function findCompetitionsWithLiveScoreSyncEnabled() {
  return listCompetitionsWithLiveScoreSyncEnabled();
}

export function findCompetitionsWithNotificationRemindersEnabled() {
  return listCompetitionsWithNotificationRemindersEnabled();
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

export function addCompetition(input: Parameters<typeof createCompetition>[0]) {
  return createCompetition(input);
}

export function setCompetitionManagementSettings(
  competitionId: number,
  input: Parameters<typeof updateCompetitionManagementSettings>[1]
) {
  return updateCompetitionManagementSettings(competitionId, input);
}
