import webPush, { PushSubscription } from 'web-push';

import { config } from '../../config/index.js';
import { getAppMetadataValue, setAppMetadataValue } from '../../database/queries/app-metadata.queries.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import { SavePushSubscriptionRequest, UpdateNotificationSettingsRequest } from './notifications.interfaces.js';
import {
  disableAllUserNotificationSubscriptions,
  disableUserNotificationSubscription,
  findUserNotificationSubscriptions,
  findReminderCandidates,
  getNotificationSubscriptionStats,
  listRecentReminderDeliveries,
  markReminderDelivered,
  saveUserNotificationSubscription
} from './notifications.repository.js';

webPush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);

const notificationRemindersEnabledKey = 'notification_reminders_enabled';
const notificationReminderLastRunKey = 'notification_reminder_last_run';
const secretCodeMaxLength = 128;
const recentReminderDeliveryLimit = 20;
const dueReminderCandidateLimit = 20;

export interface NotificationReminderRunReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly enabled: boolean;
  readonly candidateCount: number;
  readonly sentCount: number;
  readonly failedCount: number;
  readonly disabledSubscriptionCount: number;
  readonly errorMessage: string | null;
}

export type UpdateNotificationSettingsResult =
  | {
      readonly status: 'updated';
      readonly settings: {
        readonly remindersEnabled: boolean;
      };
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    };

export async function getNotificationConfig() {
  return {
    vapidPublicKey: config.vapidPublicKey,
    remindersEnabled: await areNotificationRemindersEnabled()
  };
}

export async function getNotificationSettings() {
  return {
    remindersEnabled: await areNotificationRemindersEnabled()
  };
}

export async function getNotificationReminderJobSnapshot() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() - config.notificationReminderIntervalMs);
  const remindersEnabled = await areNotificationRemindersEnabled();
  const subscriptionStats = getNotificationSubscriptionStats();
  const dueCandidates = remindersEnabled ? findReminderCandidates(now, windowEnd) : [];

  return {
    enabled: remindersEnabled,
    intervalMs: config.notificationReminderIntervalMs,
    dueCandidateCount: dueCandidates.length,
    activeSubscriptions: subscriptionStats.active_subscriptions,
    disabledSubscriptions: subscriptionStats.disabled_subscriptions,
    totalSubscriptions: subscriptionStats.total_subscriptions,
    usersWithActiveSubscriptions: subscriptionStats.users_with_active_subscriptions,
    lastRun: await getLastNotificationReminderRun(),
    dueCandidates: dueCandidates.slice(0, dueReminderCandidateLimit).map((candidate) => ({
      userId: candidate.user_id,
      username: candidate.username,
      predictionRound: candidate.prediction_round,
      deadlineAt: candidate.deadline_at,
      expectedCount: candidate.expected_count,
      submittedCount: candidate.submitted_count,
      reminderHours: candidate.reminder_hours
    })),
    recentDeliveries: listRecentReminderDeliveries(recentReminderDeliveryLimit).map((delivery) => ({
      userId: delivery.user_id,
      username: delivery.username,
      predictionRound: delivery.prediction_round,
      reminderHours: delivery.reminder_hours,
      deliveredAt: delivery.created_at
    }))
  };
}

export async function updateNotificationSettings(
  input: Partial<UpdateNotificationSettingsRequest> | undefined
): Promise<UpdateNotificationSettingsResult> {
  if (
    typeof input?.remindersEnabled !== 'boolean' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const remindersEnabled = input.remindersEnabled === true;

  setAppMetadataValue(notificationRemindersEnabledKey, remindersEnabled ? 'true' : 'false');

  return {
    status: 'updated',
    settings: {
      remindersEnabled
    }
  };
}

export async function savePushSubscription(
  userId: number,
  input: Partial<SavePushSubscriptionRequest> | undefined,
  userAgent: string | null
): Promise<boolean> {
  if (!isValidSubscriptionRequest(input)) {
    return false;
  }

  saveUserNotificationSubscription(userId, {
    endpoint: input.endpoint,
    subscriptionJson: JSON.stringify(input),
    userAgent
  });

  return true;
}

export function startNotificationReminderScheduler(): void {
  if (config.notificationReminderIntervalMs <= 0) {
    return;
  }

  void sendDuePredictionReminders();

  setInterval(() => {
    void sendDuePredictionReminders();
  }, config.notificationReminderIntervalMs);
}

export async function sendDuePredictionReminders(): Promise<NotificationReminderRunReport> {
  const startedAt = new Date();
  const enabled = await areNotificationRemindersEnabled();
  const now = new Date();
  const windowEnd = new Date(now.getTime() - config.notificationReminderIntervalMs);
  const candidates = enabled ? findReminderCandidates(now, windowEnd) : [];
  let sentCount = 0;
  let failedCount = 0;
  let disabledSubscriptionCount = 0;
  let errorMessage: string | null = null;

  for (const candidate of candidates) {
    const payload = buildReminderPayload(candidate);

    try {
      await webPush.sendNotification(JSON.parse(candidate.subscription_json) as PushSubscription, JSON.stringify(payload));
      markReminderDelivered(candidate.user_id, candidate.prediction_round, candidate.reminder_hours);
      sentCount += 1;
    } catch (error) {
      const statusCode = readWebPushStatusCode(error);
      failedCount += 1;
      errorMessage = error instanceof Error ? error.message : 'Prediction reminder notification failed.';

      if (statusCode === 404 || statusCode === 410) {
        disableUserNotificationSubscription(candidate.endpoint);
        disabledSubscriptionCount += 1;
      }

      console.error('Prediction reminder notification failed', {
        userId: candidate.user_id,
        predictionRound: candidate.prediction_round,
        reminderHours: candidate.reminder_hours,
        statusCode
      });
    }
  }

  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    enabled,
    candidateCount: candidates.length,
    sentCount,
    failedCount,
    disabledSubscriptionCount,
    errorMessage
  };

  setAppMetadataValue(notificationReminderLastRunKey, JSON.stringify(report));

  return report;
}

export async function sendTestNotification(userId: number): Promise<{ readonly sent: number; readonly subscriptions: number }> {
  const subscriptions = findUserNotificationSubscriptions(userId);
  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        JSON.parse(subscription.subscription_json) as PushSubscription,
        JSON.stringify({
          title: 'Test reminder',
          body: 'Notifications are enabled for Predictor26.',
          icon: '/icons/predictor26-icon.svg',
          badge: '/icons/predictor26-icon.svg',
          tag: `prediction-reminder:test:${userId}`,
          data: {
            url: '/predictions',
            test: true
          }
        })
      );
      sent += 1;
    } catch (error) {
      const statusCode = readWebPushStatusCode(error);

      if (statusCode === 404 || statusCode === 410) {
        disableUserNotificationSubscription(subscription.endpoint);
      }

      console.error('Test notification failed', {
        userId,
        subscriptionId: subscription.id,
        statusCode
      });
    }
  }

  return {
    sent,
    subscriptions: subscriptions.length
  };
}

export function resetUserNotificationSubscriptions(userId: number): { readonly reset: true } {
  disableAllUserNotificationSubscriptions(userId);

  return {
    reset: true
  };
}

async function areNotificationRemindersEnabled(): Promise<boolean> {
  return (await getAppMetadataValue(notificationRemindersEnabledKey)) === 'true';
}

async function getLastNotificationReminderRun(): Promise<NotificationReminderRunReport | null> {
  const value = await getAppMetadataValue(notificationReminderLastRunKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as NotificationReminderRunReport;
  } catch {
    return null;
  }
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await getSuperAdminUser();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}

function buildReminderPayload(candidate: ReturnType<typeof findReminderCandidates>[number]) {
  const missingCount = Math.max(candidate.expected_count - candidate.submitted_count, 0);
  const roundLabel = getShortRoundLabel(candidate.prediction_round);
  const title = missingCount > 0 ? `${roundLabel}: ${missingCount} predictions left` : `${roundLabel}: predictions complete`;
  const body =
    missingCount > 0
      ? `${candidate.reminder_hours}h until lock. Post ${missingCount} missing ${missingCount === 1 ? 'prediction' : 'predictions'}.`
      : `${candidate.reminder_hours}h until lock. You can still update your predictions.`;

  return {
    title,
    body,
    icon: '/icons/predictor26-icon.svg',
    badge: '/icons/predictor26-icon.svg',
    tag: `prediction-reminder:${candidate.prediction_round}:${candidate.reminder_hours}`,
    renotify: true,
    data: {
      url: '/predictions',
      predictionRound: candidate.prediction_round,
      deadlineAt: candidate.deadline_at,
      reminderHours: candidate.reminder_hours,
      expectedCount: candidate.expected_count,
      submittedCount: candidate.submitted_count,
      missingCount
    }
  };
}

function getShortRoundLabel(label: string): string {
  const labels = new Map<string, string>([
    ['Group stage - Round 1', 'Round 1'],
    ['Group stage - Round 2', 'Round 2'],
    ['Group stage - Round 3', 'Round 3']
  ]);

  return labels.get(label) ?? label;
}

function isValidSubscriptionRequest(input: Partial<SavePushSubscriptionRequest> | undefined): input is SavePushSubscriptionRequest {
  return (
    typeof input?.endpoint === 'string' &&
    input.endpoint.startsWith('https://') &&
    typeof input.keys?.p256dh === 'string' &&
    input.keys.p256dh.length > 0 &&
    typeof input.keys.auth === 'string' &&
    input.keys.auth.length > 0
  );
}

function readWebPushStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return null;
  }

  const statusCode = (error as { readonly statusCode?: unknown }).statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}
