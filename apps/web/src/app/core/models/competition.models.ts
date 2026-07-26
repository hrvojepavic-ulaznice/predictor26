export interface Competition {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly isFinished: boolean;
  readonly tiebreakerName: string | null;
}

export interface CompetitionsResponse {
  readonly competitions: Competition[];
}

export interface UpdateCompetitionTiebreakerRequest {
  readonly tiebreakerName: string;
}

export interface UpdateCompetitionTiebreakerResponse {
  readonly competition: Competition;
}

export interface AdminCompetitionSettings {
  readonly scheduleSourceUrl: string;
  readonly oddsSourceUrl: string;
  readonly notificationRemindersEnabled: boolean;
  readonly liveScoreSyncEnabled: boolean;
}

export interface UpdateAdminCompetitionSettingsRequest {
  readonly scheduleSourceUrl: string;
  readonly oddsSourceUrl: string;
  readonly secretCode: string;
}
