import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { AdminRuleTemplate } from '@models/competition.models';
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
  protected readonly ruleTemplates = signal<AdminRuleTemplate[]>([]);
  protected readonly logoPreview = signal<string | null>(null);
  protected readonly activeCompetition = this.appState.activeCompetition;
  protected readonly sourceForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    logoUrl: ['', [Validators.maxLength(200000)]],
    passcode: ['', [Validators.maxLength(120)]],
    isFinished: [false],
    scheduleSourceUrl: ['', [Validators.maxLength(500)]],
    oddsSourceUrl: ['', [Validators.maxLength(500)]],
    rules: this.formBuilder.array<ReturnType<AdminCompetitionSetupPageComponent['createRuleControl']>>([])
  });

  protected get ruleControls() {
    return this.sourceForm.controls.rules.controls;
  }

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
    const rules = sourceSettings.rules
      .filter((rule) => rule.isEnabled)
      .map((rule) => ({
        templateKey: rule.templateKey,
        value: rule.value || null
      }));

    this.competitionsApi.updateAdminCompetitionSettings({ ...sourceSettings, rules, secretCode }).subscribe({
      next: (settings) => {
        const activeCompetition = this.activeCompetition();

        if (activeCompetition) {
          this.appState.setActiveCompetition({
            ...activeCompetition,
            name: settings.name,
            slug: settings.slug,
            logoUrl: settings.logoUrl,
            isFinished: settings.isFinished
          });
        }

        this.sourceForm.setValue({
          name: settings.name,
          logoUrl: settings.logoUrl ?? '',
          passcode: '',
          isFinished: settings.isFinished,
          scheduleSourceUrl: settings.scheduleSourceUrl,
          oddsSourceUrl: settings.oddsSourceUrl,
          rules: this.sourceForm.controls.rules.getRawValue()
        });
        this.applyRules(settings.rules);
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

    forkJoin({
      settings: this.competitionsApi.getAdminCompetitionSettings(),
      templates: this.competitionsApi.getAdminRuleTemplates()
    }).subscribe({
      next: ({ settings, templates: { templates } }) => {
        this.ruleTemplates.set(templates);
        this.sourceForm.setControl(
          'rules',
          this.formBuilder.array(templates.map((template) => this.createRuleControl(template, false)))
        );
        this.sourceForm.patchValue({
          name: settings.name,
          logoUrl: settings.logoUrl ?? '',
          passcode: '',
          isFinished: settings.isFinished,
          scheduleSourceUrl: settings.scheduleSourceUrl,
          oddsSourceUrl: settings.oddsSourceUrl
        });
        this.logoPreview.set(settings.logoUrl);
        this.applyRules(settings.rules);
        this.loadingSourceSettings.set(false);
      },
      error: () => {
        this.errorMessage.set('Competition settings could not be loaded.');
        this.loadingSourceSettings.set(false);
      }
    });
  }

  protected importLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/') || file.size > 150000) {
      this.errorMessage.set('Logo must be an image smaller than 150 KB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      this.sourceForm.controls.logoUrl.setValue(value);
      this.logoPreview.set(value || null);
      this.errorMessage.set(null);
    };
    reader.readAsDataURL(file);
  }

  protected removeLogo(): void {
    this.sourceForm.controls.logoUrl.setValue('');
    this.logoPreview.set(null);
  }

  private applyRules(rules: ReadonlyArray<{ readonly key: string; readonly value: string | null }>): void {
    const selectedRules = new Map(rules.map((rule) => [rule.key, rule.value]));

    this.ruleControls.forEach((control, index) => {
      const template = this.ruleTemplates()[index];
      const isEnabled = selectedRules.has(template.key);
      control.reset({
        templateKey: template.key,
        isEnabled,
        value: selectedRules.get(template.key) ?? template.defaultValue ?? ''
      });
    });
  }

  private createRuleControl(template: AdminRuleTemplate, isEnabled: boolean) {
    return this.formBuilder.nonNullable.group({
      templateKey: [template.key],
      isEnabled: [isEnabled],
      value: [template.defaultValue ?? '', template.valueLabel ? [Validators.required, Validators.maxLength(120)] : []]
    });
  }
}
