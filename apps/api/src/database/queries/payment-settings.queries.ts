import { openDatabase } from '../index.js';

export type PaymentSettingType = 'iban' | 'keks' | 'revolut' | 'cash';

export interface PaymentSettingRow {
  readonly type: PaymentSettingType;
  readonly value: string;
  readonly is_enabled: 0 | 1;
}

export interface UpdatePaymentSettingsInput {
  readonly iban: string;
  readonly keks: string;
  readonly revolut: string;
  readonly cashEnabled: boolean;
}

export async function listPaymentSettings(): Promise<PaymentSettingRow[]> {
  const db = openDatabase();

  try {
    return db
      .prepare(
        `
        SELECT type, value, is_enabled
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

export async function updatePaymentSettings(input: UpdatePaymentSettingsInput): Promise<PaymentSettingRow[]> {
  const db = openDatabase();

  try {
    const updateStatement = db.prepare(
      `
        UPDATE payment_settings
        SET value = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE type = ?
      `
    );

    const transaction = db.transaction(() => {
      updateStatement.run(input.iban, input.iban.length > 0 ? 1 : 0, 'iban');
      updateStatement.run(input.keks, input.keks.length > 0 ? 1 : 0, 'keks');
      updateStatement.run(input.revolut, input.revolut.length > 0 ? 1 : 0, 'revolut');
      updateStatement.run('', input.cashEnabled ? 1 : 0, 'cash');
    });

    transaction();

    return db
      .prepare(
        `
        SELECT type, value, is_enabled
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
