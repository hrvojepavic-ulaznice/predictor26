import {
  listPaymentSettings,
  updatePaymentSettings,
  UpdatePaymentSettingsInput
} from '../../database/queries/payment-settings.queries.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';

export async function findPaymentSettingsForAdmin() {
  return listPaymentSettings();
}

export async function savePaymentSettingsForAdmin(input: UpdatePaymentSettingsInput) {
  return updatePaymentSettings(input);
}

export async function findSuperAdminForPaymentSecretCode() {
  return getSuperAdminUser();
}
