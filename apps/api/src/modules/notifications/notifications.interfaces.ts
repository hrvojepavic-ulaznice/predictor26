export interface PushSubscriptionKeysRequest {
  readonly p256dh: string;
  readonly auth: string;
}

export interface SavePushSubscriptionRequest {
  readonly endpoint: string;
  readonly expirationTime?: number | null;
  readonly keys: PushSubscriptionKeysRequest;
}

export interface NotificationConfigResponse {
  readonly vapidPublicKey: string;
  readonly remindersEnabled: boolean;
}

export interface SavePushSubscriptionResponse {
  readonly subscribed: true;
}

export interface NotificationSettingsResponse {
  readonly remindersEnabled: boolean;
}

export interface UpdateNotificationSettingsRequest {
  readonly remindersEnabled: boolean;
  readonly secretCode: string;
}

export interface SendTestNotificationResponse {
  readonly sent: number;
  readonly subscriptions: number;
}
