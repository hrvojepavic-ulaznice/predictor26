import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { RulesModalComponent } from '@features/rules/rules-modal.component';
import { SessionDataRefreshService } from '@services/session-data-refresh.service';
import { AuthApiProvider } from '@services/providers/auth-api.provider';
import { WorldCupTeamsApiProvider } from '@services/providers/world-cup-teams-api.provider';
import { FormFieldStateDirective } from '@shared/directives/form-field-state.directive';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, FormFieldStateDirective, RulesModalComponent],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
})
export class RegisterPageComponent {
  private readonly appState = inject(AppStateService);
  private readonly authApi = inject(AuthApiProvider);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionDataRefresh = inject(SessionDataRefreshService);
  private readonly worldCupTeamsApi = inject(WorldCupTeamsApiProvider);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isRulesModalOpen = signal(false);
  protected readonly tiebreakerOptions = signal<string[]>([]);
  protected readonly tiebreakerOptionsLoading = signal(true);

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(80)]],
    lastname: ['', [Validators.required, Validators.maxLength(80)]],
    tiebreakerName: ['', [Validators.required, Validators.maxLength(80)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required, Validators.maxLength(128), matchingPasswordValidator]],
    acceptedRules: [false, [Validators.requiredTrue]]
  });

  constructor() {
    this.registerForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.errorMessage.set(null);
    });

    this.registerForm.controls.username.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const usernameControl = this.registerForm.controls.username;

      if (usernameControl.hasError('usernameTaken')) {
        const errors = { ...usernameControl.errors };
        delete errors['usernameTaken'];
        usernameControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    });

    this.registerForm.controls.password.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.registerForm.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
    });

    this.worldCupTeamsApi.getWorldCupTeams().subscribe({
      next: ({ teams }) => {
        this.tiebreakerOptions.set(teams);
        this.tiebreakerOptionsLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('World Cup teams could not be loaded.');
        this.tiebreakerOptionsLoading.set(false);
      }
    });
  }

  protected register(): void {
    if (this.registerForm.invalid || this.isSubmitting() || this.tiebreakerOptionsLoading()) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set(
        this.hasOnlyPasswordMinLengthError()
          ? 'Password must be at least 8 characters.'
          : 'Please check the highlighted fields.'
      );
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const registration = this.registerForm.getRawValue();

    this.authApi
      .register({
        username: registration.username,
        name: registration.name,
        lastname: registration.lastname,
        tiebreakerName: registration.tiebreakerName,
        password: registration.password,
        acceptedRules: registration.acceptedRules
      })
      .subscribe({
        next: (session) => {
          this.appState.setSession(session);
          this.sessionDataRefresh.refreshAfterSessionChange().subscribe(() => {
            void this.router.navigateByUrl('/');
          });
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.registerForm.controls.username.setErrors({
              ...this.registerForm.controls.username.errors,
              usernameTaken: true
            });
            this.registerForm.controls.username.markAsTouched();
          }

          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Username is already taken.'
              : 'Please check the registration fields.'
          );
          this.isSubmitting.set(false);
        }
      });
  }

  protected openRulesModal(): void {
    this.isRulesModalOpen.set(true);
  }

  protected closeRulesModal(): void {
    this.isRulesModalOpen.set(false);
  }

  private hasOnlyPasswordMinLengthError(): boolean {
    const passwordControl = this.registerForm.controls.password;

    if (!passwordControl.hasError('minlength')) {
      return false;
    }

    return Object.entries(this.registerForm.controls).every(([controlName, control]) => {
      if (controlName === 'password') {
        return control.errors ? Object.keys(control.errors).length === 1 : false;
      }

      return control.valid;
    });
  }
}

function matchingPasswordValidator(control: AbstractControl<string>): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;

  if (!password || !control.value) {
    return null;
  }

  return control.value === password ? null : { passwordMismatch: true };
}
