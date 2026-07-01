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
  listRecentReminderAttempts,
  listRecentReminderDeliveries,
  markReminderAttempted,
  markReminderDelivered,
  saveUserNotificationSubscription
} from './notifications.repository.js';

webPush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);

const notificationRemindersEnabledKey = 'notification_reminders_enabled';
const notificationReminderLastRunKey = 'notification_reminder_last_run';
const secretCodeMaxLength = 128;
const recentReminderDeliveryLimit = 20;
const recentReminderAttemptLimit = 30;
const dueReminderCandidateLimit = 20;
const reminderCandidateWindowMs = 10 * 60 * 1000;

let activeReminderRun: Promise<NotificationReminderRunReport> | null = null;

export interface NotificationReminderRunReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly enabled: boolean;
  readonly candidateCount: number;
  readonly attemptedSubscriptionCount: number;
  readonly acceptedSubscriptionCount: number;
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
  const windowEnd = new Date(now.getTime() - getReminderCandidateWindowMs());
  const remindersEnabled = await areNotificationRemindersEnabled();
  const dueCandidates = remindersEnabled ? getDueReminderCandidates(now, windowEnd) : [];
  const dueUsers = getUniqueDueReminderUsers(dueCandidates);

  return {
    enabled: remindersEnabled,
    intervalMs: config.notificationReminderIntervalMs,
    usersToNotifyNowCount: dueUsers.length,
    lastRun: await getLastNotificationReminderRun(),
    dueUsers: dueUsers.slice(0, dueReminderCandidateLimit),
    recentDeliveries: listRecentReminderDeliveries(recentReminderDeliveryLimit).map((delivery) => ({
      userId: delivery.user_id,
      username: delivery.username,
      predictionRound: delivery.prediction_round,
      reminderHours: delivery.reminder_hours,
      deliveredAt: toUtcIsoTimestamp(delivery.created_at)
    })),
    recentAttempts: listRecentReminderAttempts(recentReminderAttemptLimit).map((attempt) => ({
      userId: attempt.user_id,
      username: attempt.username,
      predictionRound: attempt.prediction_round,
      reminderHours: attempt.reminder_hours,
      subscriptionId: attempt.subscription_id,
      browser: formatBrowserLabel(attempt.user_agent),
      status: attempt.status,
      statusCode: attempt.status_code,
      errorMessage: attempt.error_message,
      attemptedAt: toUtcIsoTimestamp(attempt.created_at)
    }))
  };
}

function getUniqueDueReminderUsers(candidates: ReturnType<typeof findReminderCandidates>) {
  const users = new Map<string, {
    readonly userId: number;
    readonly username: string;
    readonly predictionRound: string;
    readonly deadlineAt: string;
    readonly expectedCount: number;
    readonly submittedCount: number;
    readonly reminderHours: 1 | 9;
  }>();

  for (const candidate of candidates) {
    const key = `${candidate.user_id}:${candidate.prediction_round}:${candidate.reminder_hours}`;

    if (!users.has(key)) {
      users.set(key, {
        userId: candidate.user_id,
        username: candidate.username,
        predictionRound: candidate.prediction_round,
        deadlineAt: candidate.deadline_at,
        expectedCount: candidate.expected_count,
        submittedCount: candidate.submitted_count,
        reminderHours: candidate.reminder_hours
      });
    }
  }

  return [...users.values()];
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
  if (activeReminderRun) {
    return activeReminderRun;
  }

  activeReminderRun = runDuePredictionReminders().finally(() => {
    activeReminderRun = null;
  });

  return activeReminderRun;
}

async function runDuePredictionReminders(): Promise<NotificationReminderRunReport> {
  const startedAt = new Date();
  const enabled = await areNotificationRemindersEnabled();
  const now = new Date();
  const windowEnd = new Date(now.getTime() - getReminderCandidateWindowMs());
  const candidates = enabled ? getDueReminderCandidates(now, windowEnd) : [];
  const candidateGroups = groupReminderCandidatesByUser(candidates);
  let acceptedSubscriptionCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let disabledSubscriptionCount = 0;
  let errorMessage: string | null = null;

  for (const group of candidateGroups) {
    const payload = buildReminderPayload(group.reminder);
    let groupAcceptedCount = 0;

    for (const candidate of group.subscriptions) {
      try {
        await webPush.sendNotification(JSON.parse(candidate.subscription_json) as PushSubscription, JSON.stringify(payload));
        markReminderAttempted({
          userId: candidate.user_id,
          subscriptionId: candidate.subscription_id,
          predictionRound: candidate.prediction_round,
          reminderHours: candidate.reminder_hours,
          status: 'accepted',
          statusCode: null,
          errorMessage: null
        });
        groupAcceptedCount += 1;
        acceptedSubscriptionCount += 1;
      } catch (error) {
        const statusCode = readWebPushStatusCode(error);
        errorMessage = readWebPushErrorMessage(error);
        const attemptStatus = statusCode === 404 || statusCode === 410 ? 'disabled' : 'failed';

        markReminderAttempted({
          userId: candidate.user_id,
          subscriptionId: candidate.subscription_id,
          predictionRound: candidate.prediction_round,
          reminderHours: candidate.reminder_hours,
          status: attemptStatus,
          statusCode,
          errorMessage
        });

        if (statusCode === 404 || statusCode === 410) {
          disableUserNotificationSubscription(candidate.endpoint);
          disabledSubscriptionCount += 1;
        }

        console.error('Prediction reminder notification failed', {
          userId: candidate.user_id,
          predictionRound: candidate.prediction_round,
          reminderHours: candidate.reminder_hours,
          subscriptionId: candidate.subscription_id,
          statusCode
        });
      }
    }

    if (groupAcceptedCount > 0) {
      markReminderDelivered(group.reminder.user_id, group.reminder.prediction_round, group.reminder.reminder_hours);
      sentCount += 1;
    } else if (group.subscriptions.length > 0) {
      failedCount += 1;
    }
  }

  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    enabled,
    candidateCount: candidateGroups.length,
    attemptedSubscriptionCount: candidates.length,
    acceptedSubscriptionCount,
    sentCount,
    failedCount,
    disabledSubscriptionCount,
    errorMessage
  };

  setAppMetadataValue(notificationReminderLastRunKey, JSON.stringify(report));

  return report;
}

type ReminderCandidate = ReturnType<typeof findReminderCandidates>[number];

function getDueReminderCandidates(now: Date, windowEnd: Date): ReminderCandidate[] {
  return findReminderCandidates().filter((candidate) => isReminderCandidateDue(candidate, now, windowEnd));
}

function isReminderCandidateDue(candidate: ReminderCandidate, now: Date, windowEnd: Date): boolean {
  const deadlineTime = Date.parse(candidate.deadline_at);

  if (Number.isNaN(deadlineTime) || deadlineTime <= now.getTime()) {
    return false;
  }

  const reminderTime = deadlineTime - candidate.reminder_hours * 60 * 60 * 1000;

  return reminderTime <= now.getTime() && reminderTime > windowEnd.getTime();
}

function groupReminderCandidatesByUser(candidates: ReminderCandidate[]) {
  const groups = new Map<
    string,
    {
      readonly reminder: ReminderCandidate;
      readonly subscriptions: ReminderCandidate[];
    }
  >();

  for (const candidate of candidates) {
    const key = `${candidate.user_id}:${candidate.prediction_round}:${candidate.reminder_hours}`;
    const group = groups.get(key);

    if (group) {
      group.subscriptions.push(candidate);
    } else {
      groups.set(key, {
        reminder: candidate,
        subscriptions: [candidate]
      });
    }
  }

  return [...groups.values()];
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

function readWebPushErrorMessage(error: unknown): string {
  const fallback = error instanceof Error ? error.message : 'Prediction reminder notification failed.';

  if (typeof error !== 'object' || error === null || !('body' in error)) {
    return fallback;
  }

  const body = (error as { readonly body?: unknown }).body;

  if (typeof body !== 'string' || body.trim().length === 0) {
    return fallback;
  }

  return `${fallback}: ${body.trim().slice(0, 500)}`;
}

function getReminderCandidateWindowMs(): number {
  return reminderCandidateWindowMs;
}

function toUtcIsoTimestamp(value: string): string {
  if (Number.isNaN(Date.parse(value))) {
    return value;
  }

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value).toISOString();
  }

  return new Date(`${value.replace(' ', 'T')}Z`).toISOString();
}

function formatBrowserLabel(userAgent: string | null): string {
  if (!userAgent) {
    return 'Unknown browser';
  }

  if (userAgent.includes('Edg/')) {
    return 'Edge';
  }

  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) {
    return 'Opera';
  }

  if (userAgent.includes('Firefox/')) {
    return 'Firefox';
  }

  if (userAgent.includes('Chrome/') && userAgent.includes('Safari/')) {
    return 'Chrome/Chromium';
  }

  if (userAgent.includes('Safari/') && userAgent.includes('Version/')) {
    return 'Safari';
  }

  return 'Unknown browser';
}
