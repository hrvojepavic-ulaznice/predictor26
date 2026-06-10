import { PaymentSettingRow } from '../../database/queries/payment-settings.queries.js';
import { PaymentInfoMethodResponse, PaymentInfoResponse } from './payments.interfaces.js';
import { findPaymentSettingsConfigForUser, findPaymentSettingsForUser, findPaymentUser } from './payments.repository.js';

export async function getPaymentInfoForUser(userId: number): Promise<PaymentInfoResponse> {
  const [user, config] = await Promise.all([findPaymentUser(userId), findPaymentSettingsConfigForUser()]);

  if (!user || user.is_verified === 1 || config.show_payment_info !== 1) {
    return {
      visible: false,
      methods: []
    };
  }

  return {
    visible: true,
    methods: toPaymentMethods(await findPaymentSettingsForUser())
  };
}

function toPaymentMethods(rows: readonly PaymentSettingRow[]): PaymentInfoMethodResponse[] {
  const methods: PaymentInfoMethodResponse[] = [];
  const byType = new Map(rows.map((row) => [row.type, row]));
  const iban = byType.get('iban');
  const keks = byType.get('keks');
  const revolut = byType.get('revolut');
  const cash = byType.get('cash');

  if (iban?.is_enabled === 1 && iban.value.length > 0) {
    methods.push({
      type: 'iban',
      label: 'IBAN',
      value: iban.value,
      fastPayUrl: null,
      copyable: true
    });
  }

  if (keks?.is_enabled === 1 && (keks.value.length > 0 || keks.fast_pay_url.length > 0)) {
    methods.push({
      type: 'keks',
      label: 'KEKS',
      value: keks.value,
      fastPayUrl: keks.fast_pay_url || null,
      copyable: keks.value.length > 0
    });
  }

  if (revolut?.is_enabled === 1 && (revolut.value.length > 0 || revolut.fast_pay_url.length > 0)) {
    methods.push({
      type: 'revolut',
      label: 'Revolut',
      value: revolut.value,
      fastPayUrl: revolut.fast_pay_url || null,
      copyable: revolut.value.length > 0
    });
  }

  if (cash?.is_enabled === 1) {
    methods.push({
      type: 'cash',
      label: 'Cash',
      value: 'You can pay by cash as well.',
      fastPayUrl: null,
      copyable: false
    });
  }

  return methods;
}
