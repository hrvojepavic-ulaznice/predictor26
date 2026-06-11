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
  markReminderDelivered,
  saveUserNotificationSubscription
} from './notifications.repository.js';

webPush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);

const notificationRemindersEnabledKey = 'notification_reminders_enabled';
const secretCodeMaxLength = 128;

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

export async function sendDuePredictionReminders(): Promise<void> {
  if (!(await areNotificationRemindersEnabled())) {
    return;
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() - config.notificationReminderIntervalMs);
  const candidates = findReminderCandidates(now, windowEnd);

  for (const candidate of candidates) {
    const payload = buildReminderPayload(candidate);

    try {
      await webPush.sendNotification(JSON.parse(candidate.subscription_json) as PushSubscription, JSON.stringify(payload));
      markReminderDelivered(candidate.user_id, candidate.prediction_round, candidate.reminder_hours);
    } catch (error) {
      const statusCode = readWebPushStatusCode(error);

      if (statusCode === 404 || statusCode === 410) {
        disableUserNotificationSubscription(candidate.endpoint);
      }

      console.error('Prediction reminder notification failed', {
        userId: candidate.user_id,
        predictionRound: candidate.prediction_round,
        reminderHours: candidate.reminder_hours,
        statusCode
      });
    }
  }
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
