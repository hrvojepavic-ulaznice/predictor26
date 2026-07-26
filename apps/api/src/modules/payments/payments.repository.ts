import { getPaymentSettingsConfig, listPaymentSettings } from '../../database/queries/payment-settings.queries.js';
import { getUserByIdForCompetition } from '../../database/queries/users.queries.js';

export async function findPaymentSettingsForUser(competitionId: number) {
  return listPaymentSettings(competitionId);
}

export async function findPaymentSettingsConfigForUser(competitionId: number) {
  return getPaymentSettingsConfig(competitionId);
}

export async function findPaymentUser(userId: number, competitionId: number) {
  return getUserByIdForCompetition(userId, competitionId);
}
