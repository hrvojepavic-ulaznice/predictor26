import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  NotificationConfigResponse,
  NotificationSettingsResponse,
  SavePushSubscriptionResponse,
  SendTestNotificationResponse,
  UpdateNotificationSettingsRequest
} from '@models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationsApiProvider {
  private readonly http = inject(HttpClient);

  getConfig() {
    return this.http.get<NotificationConfigResponse>('/api/notifications/config');
  }

  saveSubscription(subscription: PushSubscription) {
    return this.http.post<SavePushSubscriptionResponse>('/api/notifications/subscriptions', subscription.toJSON());
  }

  getAdminSettings() {
    return this.http.get<NotificationSettingsResponse>('/api/admin/notifications/settings');
  }

  updateAdminSettings(request: UpdateNotificationSettingsRequest) {
    return this.http.patch<NotificationSettingsResponse>('/api/admin/notifications/settings', request);
  }

  sendTestNotification() {
    return this.http.post<SendTestNotificationResponse>('/api/admin/notifications/test', {});
  }

  resetAdminSubscriptions() {
    return this.http.post<{ readonly reset: true }>('/api/admin/notifications/reset-subscriptions', {});
  }
}
