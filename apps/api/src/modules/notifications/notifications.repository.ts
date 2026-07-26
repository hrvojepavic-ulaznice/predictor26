import {
  disableNotificationSubscription,
  disableNotificationSubscriptionsForUser,
  listRecentReminderAttempts,
  listNotificationSubscriptionsForUser,
  listRecentReminderDeliveries,
  listReminderCandidates,
  PushSubscriptionInput,
  recordReminderAttempt,
  recordReminderDelivery,
  ReminderAttemptInput,
  upsertNotificationSubscription
} from '../../database/queries/notifications.queries.js';

export function saveUserNotificationSubscription(userId: number, input: PushSubscriptionInput): void {
  upsertNotificationSubscription(userId, input);
}

export function disableUserNotificationSubscription(endpoint: string): void {
  disableNotificationSubscription(endpoint);
}

export function disableAllUserNotificationSubscriptions(userId: number): void {
  disableNotificationSubscriptionsForUser(userId);
}

export function findUserNotificationSubscriptions(userId: number) {
  return listNotificationSubscriptionsForUser(userId);
}

export function findReminderCandidates(competitionId: number) {
  return listReminderCandidates(competitionId);
}

export function markReminderDelivered(competitionId: number, userId: number, predictionRound: string, reminderHours: 1 | 9): void {
  recordReminderDelivery(competitionId, userId, predictionRound, reminderHours);
}

export function markReminderAttempted(input: ReminderAttemptInput): void {
  recordReminderAttempt(input);
}

export { listRecentReminderAttempts, listRecentReminderDeliveries };
