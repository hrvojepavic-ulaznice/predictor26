import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormFieldStateDirective } from '@shared/directives/form-field-state.directive';

@Component({
  selector: 'app-secret-code-modal',
  imports: [ReactiveFormsModule, FormFieldStateDirective],
  templateUrl: './secret-code-modal.component.html',
  styleUrl: './secret-code-modal.component.scss'
})
export class SecretCodeModalComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly title = input('Confirm action');
  readonly label = input('What is the secret code?');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly errorMessage = input<string | null>(null);
  readonly isSubmitting = input(false);

  readonly confirmSecretCode = output<string>();
  readonly cancelModal = output<void>();

  protected readonly secretCodeForm = this.formBuilder.nonNullable.group({
    secretCode: ['', [Validators.required, Validators.maxLength(128)]]
  });

  protected confirm(): void {
    if (this.secretCodeForm.invalid || this.isSubmitting()) {
      this.secretCodeForm.markAllAsTouched();
      return;
    }

    this.confirmSecretCode.emit(this.secretCodeForm.getRawValue().secretCode);
  }

  protected cancel(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.cancelModal.emit();
  }
}
