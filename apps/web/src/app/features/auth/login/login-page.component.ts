import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthApiProvider } from '@services/providers/auth-api.provider';
import { AppStateService } from '@core/state/app-state.service';
import { SessionDataRefreshService } from '@services/session-data-refresh.service';
import { FormFieldStateDirective } from '@shared/directives/form-field-state.directive';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, FormFieldStateDirective],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly authApi = inject(AuthApiProvider);
  private readonly appState = inject(AppStateService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionDataRefresh = inject(SessionDataRefreshService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  @ViewChild('usernameInput')
  private readonly usernameInput?: ElementRef<HTMLInputElement>;

  @ViewChild('passwordInput')
  private readonly passwordInput?: ElementRef<HTMLInputElement>;

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
  });

  constructor() {
    this.loginForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.errorMessage.set(null);
    });
  }

  protected login(): void {
    this.syncNativeInputValues();

    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Invalid username or password.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authApi.login(this.loginForm.getRawValue()).subscribe({
      next: (session) => {
        this.appState.setSession(session);
        this.sessionDataRefresh.refreshAfterSessionChange().subscribe(() => {
          void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/');
        });
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Invalid username or password.'
            : 'Login failed. Please try again.'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  private syncNativeInputValues(): void {
    const username = this.usernameInput?.nativeElement.value;
    const password = this.passwordInput?.nativeElement.value;

    if (username !== undefined && username !== this.loginForm.controls.username.value) {
      this.loginForm.controls.username.setValue(username);
    }

    if (password !== undefined && password !== this.loginForm.controls.password.value) {
      this.loginForm.controls.password.setValue(password);
    }
  }
}
