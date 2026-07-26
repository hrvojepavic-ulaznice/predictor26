import {
  getPaymentSettingsConfig,
  listPaymentSettings,
  updatePaymentSettings,
  UpdatePaymentSettingsInput
} from '../../database/queries/payment-settings.queries.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';

export async function findPaymentSettingsForAdmin(competitionId: number) {
  return listPaymentSettings(competitionId);
}

export async function findPaymentSettingsConfigForAdmin(competitionId: number) {
  return getPaymentSettingsConfig(competitionId);
}

export async function savePaymentSettingsForAdmin(competitionId: number, input: UpdatePaymentSettingsInput) {
  return updatePaymentSettings(competitionId, input);
}

export async function findSuperAdminForPaymentSecretCode() {
  return getSuperAdminUser();
}
