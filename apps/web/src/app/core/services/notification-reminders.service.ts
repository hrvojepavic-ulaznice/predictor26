import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NotificationsApiProvider } from './providers/notifications-api.provider';

export type NotificationReminderEnableResult =
  | {
      readonly status: 'subscribed';
      readonly permission: NotificationPermission;
    }
  | {
      readonly status: 'blocked' | 'disabled' | 'unsupported' | 'failed';
      readonly permission: NotificationPermission | null;
    };

@Injectable({
  providedIn: 'root'
})
export class NotificationRemindersService {
  private readonly notificationsApi = inject(NotificationsApiProvider);
  private readonly remindersEnabledSignal = signal(false);
  private configLoaded = false;

  readonly remindersEnabled = this.remindersEnabledSignal.asReadonly();

  async ensureConfig(): Promise<boolean> {
    if (this.configLoaded) {
      return this.remindersEnabledSignal();
    }

    const config = await firstValueFrom(this.notificationsApi.getConfig());

    this.configLoaded = true;
    this.remindersEnabledSignal.set(config.remindersEnabled);

    return config.remindersEnabled;
  }

  async enableReminders(): Promise<NotificationReminderEnableResult> {
    const config = await firstValueFrom(this.notificationsApi.getConfig());

    this.configLoaded = true;
    this.remindersEnabledSignal.set(config.remindersEnabled);

    if (!config.remindersEnabled) {
      return { status: 'disabled', permission: null };
    }

    if (!this.areNotificationsSupported()) {
      return { status: 'unsupported', permission: null };
    }

    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;

    if (permission !== 'granted') {
      return { status: 'blocked', permission };
    }

    try {
      await this.subscribeCurrentBrowser(config.vapidPublicKey);
      return { status: 'subscribed', permission };
    } catch (error) {
      console.error('Notification reminder subscription failed', error);
      return { status: 'failed', permission };
    }
  }

  async enableCurrentBrowserForAdminTest(): Promise<NotificationReminderEnableResult> {
    if (!this.areNotificationsSupported()) {
      return { status: 'unsupported', permission: null };
    }

    const config = await firstValueFrom(this.notificationsApi.getConfig());
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;

    if (permission !== 'granted') {
      return { status: 'blocked', permission };
    }

    try {
      await firstValueFrom(this.notificationsApi.resetAdminSubscriptions());
      await this.subscribeCurrentBrowser(config.vapidPublicKey, true);
      return { status: 'subscribed', permission };
    } catch (error) {
      console.error('Admin test notification subscription failed', error);
      return { status: 'failed', permission };
    }
  }

  private async subscribeCurrentBrowser(vapidPublicKey: string, replaceExisting = false): Promise<void> {
    const registration = await navigator.serviceWorker.register('/notification-sw.js');
    await registration.update();
    const readyRegistration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    if (replaceExisting && existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const subscription =
      !replaceExisting && existingSubscription
        ? existingSubscription
        : await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey)
      });

    await firstValueFrom(this.notificationsApi.saveSubscription(subscription));
  }

  private areNotificationsSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output.buffer as ArrayBuffer;
}
