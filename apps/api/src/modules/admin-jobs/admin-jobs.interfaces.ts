import { NotificationReminderRunReport } from '../notifications/notifications.service.js';

export interface AdminJobSummaryResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly lastRun: NotificationReminderRunReport | null;
}

export interface AdminNotificationReminderJobDetailsResponse extends AdminJobSummaryResponse {
  readonly dueCandidateCount: number;
  readonly activeSubscriptions: number;
  readonly disabledSubscriptions: number;
  readonly totalSubscriptions: number;
  readonly usersWithActiveSubscriptions: number;
  readonly dueCandidates: Array<{
    readonly userId: number;
    readonly username: string;
    readonly predictionRound: string;
    readonly deadlineAt: string;
    readonly expectedCount: number;
    readonly submittedCount: number;
    readonly reminderHours: 1 | 9;
  }>;
  readonly recentDeliveries: Array<{
    readonly userId: number;
    readonly username: string;
    readonly predictionRound: string;
    readonly reminderHours: 1 | 9;
    readonly deliveredAt: string;
  }>;
}

export interface AdminJobsResponse {
  readonly jobs: AdminJobSummaryResponse[];
}

export interface AdminJobDetailsResponse {
  readonly job: AdminNotificationReminderJobDetailsResponse;
}

export interface RunAdminJobResponse {
  readonly job: AdminNotificationReminderJobDetailsResponse;
  readonly run: NotificationReminderRunReport;
}
