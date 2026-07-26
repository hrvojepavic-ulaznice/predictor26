import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { CompetitionsApiProvider } from '@services/providers/competitions-api.provider';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SecretCodeModalComponent } from '@shared/components/secret-code-modal/secret-code-modal.component';

@Component({
  selector: 'app-admin-competition-setup-page',
  imports: [ModalShellComponent, ReactiveFormsModule, RouterLink, SecretCodeModalComponent],
  templateUrl: './admin-competition-setup-page.component.html',
  styleUrl: './admin-competition-setup-page.component.scss'
})
export class AdminCompetitionSetupPageComponent {
  private readonly appState = inject(AppStateService);
  private readonly competitionsApi = inject(CompetitionsApiProvider);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loadingSourceSettings = signal(false);
  protected readonly savingSourceSettings = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly sourceSecretCodeErrorMessage = signal<string | null>(null);
  protected readonly sourceSettingsSecretPromptOpen = signal(false);
  protected readonly activeCompetition = this.appState.activeCompetition;
  protected readonly sourceForm = this.formBuilder.nonNullable.group({
    scheduleSourceUrl: ['', [Validators.required, Validators.maxLength(500)]],
    oddsSourceUrl: ['', [Validators.required, Validators.maxLength(500)]]
  });

  constructor() {
    this.loadSourceSettings();
  }

  protected openSourceSettingsSecretCode(): void {
    if (!this.activeCompetition() || this.savingSourceSettings()) {
      return;
    }

    if (this.sourceForm.invalid) {
      this.errorMessage.set('Please enter valid source URLs.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.sourceSecretCodeErrorMessage.set(null);
    this.sourceSettingsSecretPromptOpen.set(true);
  }

  protected cancelSourceSecretCode(): void {
    if (!this.savingSourceSettings()) {
      this.sourceSettingsSecretPromptOpen.set(false);
      this.sourceSecretCodeErrorMessage.set(null);
    }
  }

  protected confirmSourceSecretCode(secretCode: string): void {
    if (!this.activeCompetition() || this.savingSourceSettings() || this.sourceForm.invalid) {
      return;
    }

    this.savingSourceSettings.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.sourceSecretCodeErrorMessage.set(null);

    const sourceSettings = this.sourceForm.getRawValue();

    this.competitionsApi.updateAdminCompetitionSettings({ ...sourceSettings, secretCode }).subscribe({
      next: (settings) => {
        this.sourceForm.setValue({
          scheduleSourceUrl: settings.scheduleSourceUrl,
          oddsSourceUrl: settings.oddsSourceUrl
        });
        this.successMessage.set('Competition source settings saved.');
        this.sourceSettingsSecretPromptOpen.set(false);
        this.savingSourceSettings.set(false);
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Competition source settings could not be saved.';

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.sourceSecretCodeErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.sourceSettingsSecretPromptOpen.set(false);
        }

        this.savingSourceSettings.set(false);
      }
    });
  }

  private loadSourceSettings(): void {
    if (!this.activeCompetition()) {
      return;
    }

    this.loadingSourceSettings.set(true);

    this.competitionsApi.getAdminCompetitionSettings().subscribe({
      next: (settings) => {
        this.sourceForm.setValue({
          scheduleSourceUrl: settings.scheduleSourceUrl,
          oddsSourceUrl: settings.oddsSourceUrl
        });
        this.loadingSourceSettings.set(false);
      },
      error: () => {
        this.errorMessage.set('Competition source settings could not be loaded.');
        this.loadingSourceSettings.set(false);
      }
    });
  }
}
