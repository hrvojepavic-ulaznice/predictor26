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
const paymentUrlMaxLength = 500;
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
    typeof input.keksFastPayUrl !== 'string' ||
    typeof input.revolut !== 'string' ||
    typeof input.revolutFastPayUrl !== 'string' ||
    typeof input.cashEnabled !== 'boolean' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  const iban = input.iban.trim();
  const keks = input.keks.trim();
  const keksFastPayUrl = input.keksFastPayUrl.trim();
  const revolut = input.revolut.trim();
  const revolutFastPayUrl = input.revolutFastPayUrl.trim();

  if (
    iban.length > paymentValueMaxLength ||
    keks.length > paymentValueMaxLength ||
    revolut.length > paymentValueMaxLength ||
    keksFastPayUrl.length > paymentUrlMaxLength ||
    revolutFastPayUrl.length > paymentUrlMaxLength ||
    !isValidPaymentUrl(keksFastPayUrl) ||
    !isValidPaymentUrl(revolutFastPayUrl)
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const rows = await savePaymentSettingsForAdmin({
    iban,
    keks,
    keksFastPayUrl,
    revolut,
    revolutFastPayUrl,
    cashEnabled: input.cashEnabled
  });

  return {
    status: 'updated',
    settings: toPaymentSettingsResponse(rows)
  };
}

function isValidPaymentUrl(url: string): boolean {
  if (url.length === 0) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);

    return ['http:', 'https:', 'revolut:', 'keks:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
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
    keksFastPayUrl: byType.get('keks')?.fast_pay_url ?? '',
    revolut: byType.get('revolut')?.value ?? '',
    revolutFastPayUrl: byType.get('revolut')?.fast_pay_url ?? '',
    cashEnabled: byType.get('cash')?.is_enabled === 1
  };
}
