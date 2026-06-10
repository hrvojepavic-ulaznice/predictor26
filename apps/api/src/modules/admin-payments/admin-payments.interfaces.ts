export interface AdminPaymentSettingsResponse {
  readonly iban: string;
  readonly keks: string;
  readonly revolut: string;
  readonly cashEnabled: boolean;
}

export interface UpdateAdminPaymentSettingsRequest {
  readonly iban: string;
  readonly keks: string;
  readonly revolut: string;
  readonly cashEnabled: boolean;
  readonly secretCode: string;
}
