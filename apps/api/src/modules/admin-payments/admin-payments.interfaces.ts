export interface AdminPaymentSettingsResponse {
  readonly iban: string;
  readonly keks: string;
  readonly keksFastPayUrl: string;
  readonly revolut: string;
  readonly revolutFastPayUrl: string;
  readonly cashEnabled: boolean;
}

export interface UpdateAdminPaymentSettingsRequest {
  readonly iban: string;
  readonly keks: string;
  readonly keksFastPayUrl: string;
  readonly revolut: string;
  readonly revolutFastPayUrl: string;
  readonly cashEnabled: boolean;
  readonly secretCode: string;
}
