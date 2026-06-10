import { openDatabase } from '../index.js';

export type PaymentSettingType = 'iban' | 'keks' | 'revolut' | 'cash';

export interface PaymentSettingRow {
  readonly type: PaymentSettingType;
  readonly value: string;
  readonly fast_pay_url: string;
  readonly is_enabled: 0 | 1;
}

export interface UpdatePaymentSettingsInput {
  readonly iban: string;
  readonly keks: string;
  readonly keksFastPayUrl: string;
  readonly revolut: string;
  readonly revolutFastPayUrl: string;
  readonly cashEnabled: boolean;
  readonly showPaymentInfo: boolean;
}

export interface PaymentSettingsConfigRow {
  readonly show_payment_info: 0 | 1;
}

export async function listPaymentSettings(): Promise<PaymentSettingRow[]> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT type, value, fast_pay_url, is_enabled
        FROM payment_settings
        ORDER BY
          CASE type
            WHEN 'iban' THEN 1
            WHEN 'keks' THEN 2
            WHEN 'revolut' THEN 3
            WHEN 'cash' THEN 4
          END
      `
      )
      .all() as PaymentSettingRow[];
  } finally {
    db.close();
  }
}

export async function getPaymentSettingsConfig(): Promise<PaymentSettingsConfigRow> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT show_payment_info
        FROM payment_settings_config
        WHERE id = 1
      `
      )
      .get() as PaymentSettingsConfigRow;
  } finally {
    db.close();
  }
}

export async function updatePaymentSettings(input: UpdatePaymentSettingsInput): Promise<PaymentSettingRow[]> {
  const db = openDatabase();

  try {
    const updateStatement = db.prepare(
      `
        UPDATE payment_settings
        SET value = ?, fast_pay_url = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE type = ?
      `
    );

    const transaction = db.transaction(() => {
      updateStatement.run(input.iban, '', input.iban.length > 0 ? 1 : 0, 'iban');
      updateStatement.run(input.keks, input.keksFastPayUrl, input.keks.length > 0 || input.keksFastPayUrl.length > 0 ? 1 : 0, 'keks');
      updateStatement.run(
        input.revolut,
        input.revolutFastPayUrl,
        input.revolut.length > 0 || input.revolutFastPayUrl.length > 0 ? 1 : 0,
        'revolut'
      );
      updateStatement.run('', '', input.cashEnabled ? 1 : 0, 'cash');
      db.prepare(
        `
          UPDATE payment_settings_config
          SET show_payment_info = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `
      ).run(input.showPaymentInfo ? 1 : 0);
    });

    transaction();

    return db
      .prepare(
        `
        SELECT type, value, fast_pay_url, is_enabled
        FROM payment_settings
        ORDER BY
          CASE type
            WHEN 'iban' THEN 1
            WHEN 'keks' THEN 2
            WHEN 'revolut' THEN 3
            WHEN 'cash' THEN 4
          END
      `
      )
      .all() as PaymentSettingRow[];
  } finally {
    db.close();
  }
}
