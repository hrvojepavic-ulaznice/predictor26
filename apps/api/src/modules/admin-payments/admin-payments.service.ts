import { PaymentSettingRow } from '../../database/queries/payment-settings.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import {
  AdminPaymentSettingsResponse,
  UpdateAdminPaymentSettingsRequest
} from './admin-payments.interfaces.js';
import {
  findPaymentSettingsForAdmin,
  findSuperAdminForPaymentSecretCode,
  savePaymentSettingsForAdmin
} from './admin-payments.repository.js';

const paymentValueMaxLength = 200;
const secretCodeMaxLength = 128;

export type UpdateAdminPaymentSettingsResult =
  | {
      readonly status: 'updated';
      readonly settings: AdminPaymentSettingsResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    };

export async function getAdminPaymentSettings(): Promise<AdminPaymentSettingsResponse> {
  return toPaymentSettingsResponse(await findPaymentSettingsForAdmin());
}

export async function changeAdminPaymentSettings(
  input: Partial<UpdateAdminPaymentSettingsRequest> | undefined
): Promise<UpdateAdminPaymentSettingsResult> {
  if (
    typeof input?.iban !== 'string' ||
    typeof input.keks !== 'string' ||
    typeof input.revolut !== 'string' ||
    typeof input.cashEnabled !== 'boolean' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  const iban = input.iban.trim();
  const keks = input.keks.trim();
  const revolut = input.revolut.trim();

  if (
    iban.length > paymentValueMaxLength ||
    keks.length > paymentValueMaxLength ||
    revolut.length > paymentValueMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const rows = await savePaymentSettingsForAdmin({
    iban,
    keks,
    revolut,
    cashEnabled: input.cashEnabled
  });

  return {
    status: 'updated',
    settings: toPaymentSettingsResponse(rows)
  };
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await findSuperAdminForPaymentSecretCode();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}

function toPaymentSettingsResponse(rows: readonly PaymentSettingRow[]): AdminPaymentSettingsResponse {
  const byType = new Map(rows.map((row) => [row.type, row]));

  return {
    iban: byType.get('iban')?.value ?? '',
    keks: byType.get('keks')?.value ?? '',
    revolut: byType.get('revolut')?.value ?? '',
    cashEnabled: byType.get('cash')?.is_enabled === 1
  };
}
