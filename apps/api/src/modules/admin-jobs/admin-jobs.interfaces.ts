import { NotificationReminderRunReport } from '../notifications/notifications.service.js';
import { LiveScoreRunReport } from '../live-scores/live-scores.service.js';

export interface AdminJobSummaryResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly lastRun: NotificationReminderRunReport | null;
}

export interface AdminLiveScoreJobSummaryResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly lastRun: LiveScoreRunReport | null;
}

export interface AdminNotificationReminderJobDetailsResponse extends AdminJobSummaryResponse {
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
}

export interface AdminLiveScoreJobDetailsResponse extends AdminLiveScoreJobSummaryResponse {
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
  readonly recentRuns: LiveScoreRunReport[];
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

export type AdminJobDetails = AdminNotificationReminderJobDetailsResponse | AdminLiveScoreJobDetailsResponse;
export type AdminJobSummary = AdminJobSummaryResponse | AdminLiveScoreJobSummaryResponse;
export type AdminJobRunReport = NotificationReminderRunReport | LiveScoreRunReport;

export interface AdminJobsResponse {
  readonly jobs: AdminJobSummary[];
}

export interface AdminJobDetailsResponse {
  readonly job: AdminJobDetails;
}

export interface RunAdminJobResponse {
  readonly job: AdminJobDetails;
  readonly run: AdminJobRunReport;
}

export interface RunAdminJobRequest {
  readonly secretCode: string;
}

export interface UpdateAdminJobEnabledRequest {
  readonly enabled: boolean;
  readonly secretCode: string;
}
