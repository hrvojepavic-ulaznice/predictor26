import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthApiProvider } from '@services/providers/auth-api.provider';
import { AppStateService } from '@core/state/app-state.service';
import { FinalResultsService } from '@services/final-results.service';
import { AppHeaderComponent } from './layout/app-header/app-header.component';
import { AppFooterComponent } from './layout/app-footer/app-footer.component';
import { FinalResultsModalComponent } from './features/final-results/final-results-modal.component';
import { ModalShellComponent } from './shared/components/modal-shell/modal-shell.component';
import { NotificationReminderDrawerComponent } from './shared/components/notification-reminder-drawer/notification-reminder-drawer.component';

@Component({
  selector: 'app-root',
  imports: [
    AppHeaderComponent,
    AppFooterComponent,
    FinalResultsModalComponent,
    ModalShellComponent,
    NotificationReminderDrawerComponent,
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly appState = inject(AppStateService);
  private readonly authApi = inject(AuthApiProvider);
  protected readonly finalResults = inject(FinalResultsService);
  protected readonly routeActivated = signal(false);

  constructor() {
    this.refreshCurrentUser();

    effect(() => {
      if (this.appState.currentUser() && this.appState.activeCompetition()) {
        untracked(() => this.finalResults.ensureFinalResults());
      }
    });
  }

  private refreshCurrentUser(): void {
    if (!this.appState.isLoggedIn()) {
      return;
    }

    this.authApi.getCurrentUser().subscribe({
      next: (user) => {
        this.appState.updateCurrentUser(user);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.appState.clearSession();
        }
      }
    });
  }
}
