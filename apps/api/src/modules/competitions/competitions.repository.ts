import {
  getCompetitionForUser,
  getCompetitionById,
  getDefaultCompetitionForUser,
  listCompetitionsWithLiveScoreSyncEnabled,
  listCompetitionsWithNotificationRemindersEnabled,
  listCompetitions,
  listCompetitionsForUser,
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

export function findCompetitionForUser(userId: number, competitionId: number) {
  return getCompetitionForUser(userId, competitionId);
}

export function findDefaultCompetitionForUser(userId: number) {
  return getDefaultCompetitionForUser(userId);
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
