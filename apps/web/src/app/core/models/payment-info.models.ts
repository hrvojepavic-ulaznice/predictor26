export interface PaymentInfoMethod {
  readonly type: 'iban' | 'keks' | 'revolut' | 'cash';
  readonly label: string;
  readonly value: string;
  readonly fastPayUrl: string | null;
  readonly copyable: boolean;
}

export interface PaymentInfo {
  readonly visible: boolean;
  readonly methods: PaymentInfoMethod[];
}
