import {
  getNotificationReminderJobSnapshot,
  sendDuePredictionReminders
} from '../notifications/notifications.service.js';
import {
  AdminJobDetailsResponse,
  AdminJobsResponse,
  AdminNotificationReminderJobDetailsResponse,
  RunAdminJobResponse
} from './admin-jobs.interfaces.js';

const notificationReminderJobId = 'prediction-reminders';

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

export async function runAdminJob(jobId: string): Promise<RunAdminJobResponse | null> {
  if (jobId !== notificationReminderJobId) {
    return null;
  }

  const run = await sendDuePredictionReminders();

  return {
    run,
    job: await getNotificationReminderJobDetails()
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
    dueCandidateCount: snapshot.dueCandidateCount,
    activeSubscriptions: snapshot.activeSubscriptions,
    disabledSubscriptions: snapshot.disabledSubscriptions,
    totalSubscriptions: snapshot.totalSubscriptions,
    usersWithActiveSubscriptions: snapshot.usersWithActiveSubscriptions,
    dueCandidates: snapshot.dueCandidates,
    recentDeliveries: snapshot.recentDeliveries
  };
}
