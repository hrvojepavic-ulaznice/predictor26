export interface AdminPaymentSettings {
  readonly iban: string;
  readonly keks: string;
  readonly revolut: string;
  readonly cashEnabled: boolean;
}

export interface UpdateAdminPaymentSettingsRequest extends AdminPaymentSettings {
  readonly secretCode: string;
}
