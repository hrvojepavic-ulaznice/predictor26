import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { RulesModalComponent } from '@features/rules/rules-modal.component';
import { SessionDataRefreshService } from '@services/session-data-refresh.service';
import { AuthApiProvider } from '@services/providers/auth-api.provider';
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

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isRulesModalOpen = signal(false);

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(80)]],
    lastname: ['', [Validators.required, Validators.maxLength(80)]],
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
  }

  protected register(): void {
    if (this.registerForm.invalid || this.isSubmitting()) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('Please check the highlighted fields.');
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
}

function matchingPasswordValidator(control: AbstractControl<string>): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;

  if (!password || !control.value) {
    return null;
  }

  return control.value === password ? null : { passwordMismatch: true };
}
