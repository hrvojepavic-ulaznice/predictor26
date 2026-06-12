export interface CompetitionSettings {
  readonly registrationsDisabled: boolean;
}

export interface UpdateCompetitionSettingsRequest {
  readonly registrationsDisabled: boolean;
  readonly secretCode: string;
}
