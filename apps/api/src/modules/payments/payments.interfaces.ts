export interface PaymentInfoMethodResponse {
  readonly type: 'iban' | 'keks' | 'revolut' | 'cash';
  readonly label: string;
  readonly value: string;
  readonly fastPayUrl: string | null;
  readonly copyable: boolean;
}

export interface PaymentInfoResponse {
  readonly visible: boolean;
  readonly methods: PaymentInfoMethodResponse[];
}
