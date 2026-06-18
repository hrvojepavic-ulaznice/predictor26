export interface AdminJobRunReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly enabled: boolean;
  readonly candidateCount: number;
  readonly attemptedSubscriptionCount?: number;
  readonly acceptedSubscriptionCount?: number;
  readonly sentCount: number;
  readonly failedCount: number;
  readonly disabledSubscriptionCount: number;
  readonly errorMessage: string | null;
}

export interface LiveScoreJobRunReport {
  readonly runId: number | null;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly enabled: boolean;
  readonly status: 'success' | 'skipped' | 'failed';
  readonly checkedMatches: number;
  readonly updatedMatches: number;
  readonly liveMatches: number;
  readonly finishedMatches: number;
  readonly nextRunAt: string | null;
  readonly errorMessage: string | null;
}

export interface AdminJobSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly lastRun: AdminJobRunReport | LiveScoreJobRunReport | null;
}

export interface AdminNotificationReminderJob extends AdminJobSummary {
  readonly id: 'prediction-reminders';
  readonly lastRun: AdminJobRunReport | null;
  readonly usersToNotifyNowCount: number;
  readonly dueUsers: Array<{
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
  readonly recentAttempts: Array<{
    readonly userId: number;
    readonly username: string;
    readonly predictionRound: string;
    readonly reminderHours: 1 | 9;
    readonly subscriptionId: number | null;
    readonly browser: string;
    readonly status: 'accepted' | 'failed' | 'disabled';
    readonly statusCode: number | null;
    readonly errorMessage: string | null;
    readonly attemptedAt: string;
  }>;
}

export interface AdminLiveScoreJob extends AdminJobSummary {
  readonly id: 'live-score-sync';
  readonly lastRun: LiveScoreJobRunReport | null;
  readonly status: 'disabled' | 'polling_live_match' | 'waiting_for_next_match';
  readonly nextRunAt: string | null;
  readonly activeMatches: Array<{
    readonly matchId: number;
    readonly matchNumber: number;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly kickoffAt: string;
    readonly currentScore: {
      readonly home: number;
      readonly away: number;
    } | null;
    readonly providerStatus: string | null;
    readonly syncedAt: string | null;
  }>;
  readonly recentRuns: LiveScoreJobRunReport[];
  readonly recentUpdates: Array<{
    readonly runId: number | null;
    readonly matchId: number;
    readonly matchNumber: number;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly previousScore: {
      readonly home: number;
      readonly away: number;
    } | null;
    readonly newScore: {
      readonly home: number;
      readonly away: number;
    };
    readonly providerStatus: string;
    readonly appliedToFinalScore: boolean;
    readonly createdAt: string;
  }>;
}

export type AdminJob = AdminNotificationReminderJob | AdminLiveScoreJob;

export interface AdminJobsResponse {
  readonly jobs: AdminJobSummary[];
}

export interface AdminJobDetailsResponse {
  readonly job: AdminJob;
}

export interface RunAdminJobResponse {
  readonly job: AdminJob;
  readonly run: AdminJobRunReport | LiveScoreJobRunReport;
}

export interface RunAdminJobRequest {
  readonly secretCode: string;
}

export interface UpdateAdminJobEnabledRequest {
  readonly enabled: boolean;
  readonly secretCode: string;
}
