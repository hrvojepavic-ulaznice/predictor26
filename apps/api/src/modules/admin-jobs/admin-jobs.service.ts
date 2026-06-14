import {
  getNotificationReminderJobSnapshot,
  sendDuePredictionReminders
} from '../notifications/notifications.service.js';
import { getLiveScoreJobSnapshot, runLiveScoreSyncNow, setLiveScoreSyncEnabled } from '../live-scores/live-scores.service.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import {
  AdminJobDetailsResponse,
  AdminJobsResponse,
  AdminNotificationReminderJobDetailsResponse,
  RunAdminJobResponse
} from './admin-jobs.interfaces.js';

const notificationReminderJobId = 'prediction-reminders';
const liveScoreSyncJobId = 'live-score-sync';
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

export type UpdateAdminJobEnabledResult =
  | {
      readonly status: 'updated';
      readonly response: AdminJobDetailsResponse;
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
  const liveScoreJob = await getLiveScoreJobDetails();

  return {
    jobs: [
      {
        id: notificationJob.id,
        name: notificationJob.name,
        description: notificationJob.description,
        enabled: notificationJob.enabled,
        intervalMs: notificationJob.intervalMs,
        lastRun: notificationJob.lastRun
      },
      {
        id: liveScoreJob.id,
        name: liveScoreJob.name,
        description: liveScoreJob.description,
        enabled: liveScoreJob.enabled,
        intervalMs: liveScoreJob.intervalMs,
        lastRun: liveScoreJob.lastRun
      }
    ]
  };
}

export async function getAdminJob(jobId: string): Promise<AdminJobDetailsResponse | null> {
  if (jobId === notificationReminderJobId) {
    return {
      job: await getNotificationReminderJobDetails()
    };
  }

  if (jobId === liveScoreSyncJobId) {
    return {
      job: await getLiveScoreJobDetails()
    };
  }

  return null;
}

export async function runAdminJob(jobId: string, input: { readonly secretCode?: unknown } | undefined): Promise<RunAdminJobResult> {
  if (jobId !== notificationReminderJobId && jobId !== liveScoreSyncJobId) {
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

  if (jobId === notificationReminderJobId) {
    const run = await sendDuePredictionReminders();

    return {
      status: 'ran',
      response: {
        run,
        job: await getNotificationReminderJobDetails()
      }
    };
  }

  const run = await runLiveScoreSyncNow();

  return {
    status: 'ran',
    response: {
      run,
      job: await getLiveScoreJobDetails()
    }
  };
}

export async function updateAdminJobEnabled(
  jobId: string,
  input: { readonly enabled?: unknown; readonly secretCode?: unknown } | undefined
): Promise<UpdateAdminJobEnabledResult> {
  if (jobId !== liveScoreSyncJobId) {
    return { status: 'not_found' };
  }

  if (
    typeof input?.enabled !== 'boolean' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  setLiveScoreSyncEnabled(input.enabled);

  return {
    status: 'updated',
    response: {
      job: await getLiveScoreJobDetails()
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

async function getLiveScoreJobDetails() {
  const snapshot = await getLiveScoreJobSnapshot();

  return {
    id: liveScoreSyncJobId,
    name: 'Live score sync',
    description: 'Checks OddsPortal near live matches, records score history, and applies fetched scores to match final scores.',
    enabled: snapshot.enabled,
    intervalMs: snapshot.intervalMs,
    lastRun: snapshot.lastRun,
    status: snapshot.status,
    nextRunAt: snapshot.nextRunAt,
    activeMatches: snapshot.activeMatches,
    recentRuns: snapshot.recentRuns,
    recentUpdates: snapshot.recentUpdates
  };
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await getSuperAdminUser();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}
