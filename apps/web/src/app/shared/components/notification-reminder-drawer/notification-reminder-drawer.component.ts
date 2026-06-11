import { Component, effect, inject, signal } from '@angular/core';

import { NotificationRemindersService } from '@services/notification-reminders.service';
import { AppStateService } from '@core/state/app-state.service';

type NotificationPromptDecision = 'subscribed' | 'blocked' | 'disabled' | 'dismissed' | 'unsupported' | 'failed';

const notificationPromptStorageKeyPrefix = 'predictor26.notification-reminder-decision';

@Component({
  selector: 'app-notification-reminder-drawer',
  templateUrl: './notification-reminder-drawer.component.html',
  styleUrl: './notification-reminder-drawer.component.scss'
})
export class NotificationReminderDrawerComponent {
  private readonly appState = inject(AppStateService);
  private readonly notificationRemindersService = inject(NotificationRemindersService);

  protected readonly visible = signal(false);
  protected readonly requestingPermission = signal(false);
  private loadedUserId: number | null = null;

  constructor() {
    effect(() => {
      const userId = this.appState.currentUser()?.id ?? null;

      if (!userId) {
        this.visible.set(false);
        return;
      }

      if (this.loadedUserId === userId) {
        this.visible.set(this.notificationRemindersService.remindersEnabled() && this.shouldShowPrompt(userId));
        return;
      }

      this.loadedUserId = userId;
      this.visible.set(false);

      void this.notificationRemindersService.ensureConfig().then((remindersEnabled) => {
        if (this.appState.currentUser()?.id !== userId) {
          return;
        }

        this.visible.set(remindersEnabled && this.shouldShowPrompt(userId));
      });
    });
  }

  protected async allowNotifications(): Promise<void> {
    if (this.requestingPermission()) {
      return;
    }

    this.requestingPermission.set(true);

    try {
      const result = await this.notificationRemindersService.enableReminders();
      this.recordDecision(result.status, result.permission);
    } finally {
      this.requestingPermission.set(false);
    }
  }

  protected skipNotifications(): void {
    this.recordDecision('dismissed');
  }

  private shouldShowPrompt(userId: number): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(this.getStorageKey(userId)) === null;
  }

  private recordDecision(decision: NotificationPromptDecision, permission: NotificationPermission | null = null): void {
    const userId = this.appState.currentUser()?.id ?? null;

    if (!userId) {
      this.visible.set(false);
      return;
    }

    const value = {
      decision,
      permission,
      decidedAt: new Date().toISOString()
    };

    window.localStorage.setItem(this.getStorageKey(userId), JSON.stringify(value));
    this.visible.set(false);
  }

  private getStorageKey(userId: number): string {
    return `${notificationPromptStorageKeyPrefix}.${userId}`;
  }
}
