import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AdminPaymentSettings, UpdateAdminPaymentSettingsRequest } from '@models/admin-payment.models';

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentsApiProvider {
  private readonly http = inject(HttpClient);

  getPaymentSettings() {
    return this.http.get<AdminPaymentSettings>('/api/admin/payments');
  }

  updatePaymentSettings(request: UpdateAdminPaymentSettingsRequest) {
    return this.http.put<AdminPaymentSettings>('/api/admin/payments', request);
  }
}
