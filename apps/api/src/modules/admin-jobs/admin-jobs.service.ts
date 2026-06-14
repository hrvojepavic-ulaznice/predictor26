import {
  getNotificationReminderJobSnapshot,
  sendDuePredictionReminders
} from '../notifications/notifications.service.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import {
  AdminJobDetailsResponse,
  AdminJobsResponse,
  AdminNotificationReminderJobDetailsResponse,
  RunAdminJobResponse
} from './admin-jobs.interfaces.js';

const notificationReminderJobId = 'prediction-reminders';
const secretCodeMaxLength = 128;

export type RunAdminJobResult =
  | {
      readonly status: 'ran';
      readonly response: RunAdminJobResponse;
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    };

export async function getAdminJobs(): Promise<AdminJobsResponse> {
  const notificationJob = await getNotificationReminderJobDetails();

  return {
    jobs: [
      {
        id: notificationJob.id,
        name: notificationJob.name,
        description: notificationJob.description,
        enabled: notificationJob.enabled,
        intervalMs: notificationJob.intervalMs,
        lastRun: notificationJob.lastRun
      }
    ]
  };
}

export async function getAdminJob(jobId: string): Promise<AdminJobDetailsResponse | null> {
  if (jobId !== notificationReminderJobId) {
    return null;
  }

  return {
    job: await getNotificationReminderJobDetails()
  };
}

export async function runAdminJob(jobId: string, input: { readonly secretCode?: unknown } | undefined): Promise<RunAdminJobResult> {
  if (jobId !== notificationReminderJobId) {
    return { status: 'not_found' };
  }

  if (
    typeof input?.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const run = await sendDuePredictionReminders();

  return {
    status: 'ran',
    response: {
      run,
      job: await getNotificationReminderJobDetails()
    }
  };
}

async function getNotificationReminderJobDetails(): Promise<AdminNotificationReminderJobDetailsResponse> {
  const snapshot = await getNotificationReminderJobSnapshot();

  return {
    id: notificationReminderJobId,
    name: 'Prediction reminders',
    description: 'Checks for users who still need predictions and sends 9h and 1h web push reminders.',
    enabled: snapshot.enabled,
    intervalMs: snapshot.intervalMs,
    lastRun: snapshot.lastRun,
    usersToNotifyNowCount: snapshot.usersToNotifyNowCount,
    dueUsers: snapshot.dueUsers,
    recentDeliveries: snapshot.recentDeliveries
  };
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await getSuperAdminUser();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}
