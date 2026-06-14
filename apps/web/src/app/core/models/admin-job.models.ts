export interface AdminJobRunReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly enabled: boolean;
  readonly candidateCount: number;
  readonly sentCount: number;
  readonly failedCount: number;
  readonly disabledSubscriptionCount: number;
  readonly errorMessage: string | null;
}

export interface AdminJobSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly lastRun: AdminJobRunReport | null;
}

export interface AdminNotificationReminderJob extends AdminJobSummary {
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
  readonly jobs: AdminJobSummary[];
}

export interface AdminJobDetailsResponse {
  readonly job: AdminNotificationReminderJob;
}

export interface RunAdminJobResponse {
  readonly job: AdminNotificationReminderJob;
  readonly run: AdminJobRunReport;
}
