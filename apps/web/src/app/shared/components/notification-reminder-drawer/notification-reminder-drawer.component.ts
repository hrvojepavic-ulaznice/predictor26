import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationRemindersService = inject(NotificationRemindersService);
  private readonly router = inject(Router);

  protected readonly visible = signal(false);
  protected readonly requestingPermission = signal(false);
  private readonly currentUrl = signal(this.router.url);
  private readonly routeCompetition = computed(() => {
    const competition = this.appState.activeCompetition();

    if (!competition) {
      return null;
    }

    const path = this.currentUrl().split('?')[0].split('#')[0];
    const competitionPath = `/competition/${competition.slug}`;

    return path === competitionPath || path.startsWith(`${competitionPath}/`) ? competition : null;
  });
  private loadedPromptKey: string | null = null;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    effect(() => {
      const userId = this.appState.currentUser()?.id ?? null;
      const competition = this.routeCompetition();

      if (!userId || !competition) {
        this.visible.set(false);
        return;
      }

      const promptKey = this.getStorageKey(userId, competition.id);

      if (this.loadedPromptKey === promptKey) {
        this.visible.set(this.notificationRemindersService.remindersEnabled() && this.shouldShowPrompt(promptKey));
        return;
      }

      this.loadedPromptKey = promptKey;
      this.visible.set(false);

      void this.notificationRemindersService.ensureConfig().then((remindersEnabled) => {
        if (this.appState.currentUser()?.id !== userId || this.routeCompetition()?.id !== competition.id) {
          return;
        }

        this.visible.set(remindersEnabled && this.shouldShowPrompt(promptKey));
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

  private shouldShowPrompt(promptKey: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(promptKey) === null;
  }

  private recordDecision(decision: NotificationPromptDecision, permission: NotificationPermission | null = null): void {
    const userId = this.appState.currentUser()?.id ?? null;
    const competition = this.routeCompetition();

    if (!userId || !competition) {
      this.visible.set(false);
      return;
    }

    const value = {
      decision,
      permission,
      decidedAt: new Date().toISOString()
    };

    window.localStorage.setItem(this.getStorageKey(userId, competition.id), JSON.stringify(value));
    this.visible.set(false);
  }

  private getStorageKey(userId: number, competitionId: number): string {
    return `${notificationPromptStorageKeyPrefix}.${userId}.${competitionId}`;
  }
}
