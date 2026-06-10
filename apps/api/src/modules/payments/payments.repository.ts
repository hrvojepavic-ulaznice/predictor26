import { getPaymentSettingsConfig, listPaymentSettings } from '../../database/queries/payment-settings.queries.js';
import { getUserById } from '../../database/queries/users.queries.js';

export async function findPaymentSettingsForUser() {
  return listPaymentSettings();
}

export async function findPaymentSettingsConfigForUser() {
  return getPaymentSettingsConfig();
}

export async function findPaymentUser(userId: number) {
  return getUserById(userId);
}
