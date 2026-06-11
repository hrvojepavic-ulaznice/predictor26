import {
  disableNotificationSubscription,
  disableNotificationSubscriptionsForUser,
  listNotificationSubscriptionsForUser,
  listReminderCandidates,
  PushSubscriptionInput,
  recordReminderDelivery,
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

export function findReminderCandidates(now: Date, windowEnd: Date) {
  return listReminderCandidates(now.toISOString(), windowEnd.toISOString());
}

export function markReminderDelivered(userId: number, predictionRound: string, reminderHours: 1 | 9): void {
  recordReminderDelivery(userId, predictionRound, reminderHours);
}
