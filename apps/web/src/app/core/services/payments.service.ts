import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

import { PaymentInfo } from '@models/payment-info.models';
import { PaymentsApiProvider } from './providers/payments-api.provider';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private readonly paymentsApi = inject(PaymentsApiProvider);
  private readonly paymentInfoSignal = signal<PaymentInfo | null>(null);
  private loadingRequest: Observable<PaymentInfo> | null = null;

  readonly paymentInfo = this.paymentInfoSignal.asReadonly();

  ensurePaymentInfo(): Observable<PaymentInfo> {
    if (this.paymentInfoSignal()) {
      return of(this.paymentInfoSignal() as PaymentInfo);
    }

    if (!this.loadingRequest) {
      this.loadingRequest = this.paymentsApi.getPaymentInfo().pipe(
        tap((paymentInfo) => {
          this.paymentInfoSignal.set(paymentInfo);
          this.loadingRequest = null;
        })
      );
    }

    return this.loadingRequest;
  }

  clearPaymentInfo(): void {
    this.paymentInfoSignal.set(null);
    this.loadingRequest = null;
  }
}
