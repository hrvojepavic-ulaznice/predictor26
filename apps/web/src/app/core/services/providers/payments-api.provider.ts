import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentInfo } from '@models/payment-info.models';

@Injectable({
  providedIn: 'root'
})
export class PaymentsApiProvider {
  private readonly http = inject(HttpClient);

  getPaymentInfo() {
    return this.http.get<PaymentInfo>('/api/payments/info');
  }
}
