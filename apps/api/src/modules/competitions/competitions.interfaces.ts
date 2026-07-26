export interface CompetitionResponse {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly isFinished: boolean;
  readonly tiebreakerName: string | null;
}

export interface CompetitionsResponse {
  readonly competitions: CompetitionResponse[];
}

export interface UpdateCompetitionTiebreakerRequest {
  readonly tiebreakerName: string;
}

export interface UpdateCompetitionTiebreakerResponse {
  readonly competition: CompetitionResponse;
}

export interface AdminCompetitionSettingsResponse {
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
