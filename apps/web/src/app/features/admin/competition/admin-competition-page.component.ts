import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CompetitionSettingsApiProvider } from '@services/providers/competition-settings-api.provider';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SecretCodeModalComponent } from '@shared/components/secret-code-modal/secret-code-modal.component';

@Component({
  selector: 'app-admin-competition-page',
  imports: [ModalShellComponent, RouterLink, SecretCodeModalComponent],
  templateUrl: './admin-competition-page.component.html',
  styleUrl: './admin-competition-page.component.scss'
})
export class AdminCompetitionPageComponent {
  private readonly competitionSettingsApi = inject(CompetitionSettingsApiProvider);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly registrationsDisabled = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly secretCodeErrorMessage = signal<string | null>(null);
  protected readonly pendingRegistrationsDisabled = signal<boolean | null>(null);

  constructor() {
    this.loadSettings();
  }

  protected toggleRegistrations(): void {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);
    this.pendingRegistrationsDisabled.set(!this.registrationsDisabled());
  }

  protected cancelSecretCode(): void {
    if (!this.saving()) {
      this.pendingRegistrationsDisabled.set(null);
      this.secretCodeErrorMessage.set(null);
    }
  }

  protected confirmSecretCode(secretCode: string): void {
    const nextDisabled = this.pendingRegistrationsDisabled();

    if (nextDisabled === null || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);

    this.competitionSettingsApi.updateAdminSettings({ registrationsDisabled: nextDisabled, secretCode }).subscribe({
      next: (settings) => {
        this.registrationsDisabled.set(settings.registrationsDisabled);
        this.successMessage.set(
          settings.registrationsDisabled ? 'Registrations disabled.' : 'Registrations enabled.'
        );
        this.pendingRegistrationsDisabled.set(null);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Competition settings could not be saved.';

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.secretCodeErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.pendingRegistrationsDisabled.set(null);
        }

        this.saving.set(false);
      }
    });
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.competitionSettingsApi.getAdminSettings().subscribe({
      next: (settings) => {
        this.registrationsDisabled.set(settings.registrationsDisabled);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Competition settings could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}
