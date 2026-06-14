import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Match } from '@models/match.models';
import { FormFieldStateDirective } from '@shared/directives/form-field-state.directive';

export interface KickoffChangeConfirmation {
  readonly kickoffAt: string;
  readonly secretCode: string;
}

@Component({
  selector: 'app-admin-match-kickoff-modal',
  imports: [ReactiveFormsModule, FormFieldStateDirective],
  templateUrl: './admin-match-kickoff-modal.component.html',
  styleUrl: './admin-match-kickoff-modal.component.scss'
})
export class AdminMatchKickoffModalComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly match = input.required<Match>();
  readonly errorMessage = input<string | null>(null);
  readonly isSubmitting = input(false);

  readonly confirmKickoffChange = output<KickoffChangeConfirmation>();
  readonly cancelModal = output<void>();

  protected readonly kickoffForm = this.formBuilder.nonNullable.group({
    kickoffAt: ['', Validators.required],
    secretCode: ['', [Validators.required, Validators.maxLength(128)]]
  });

  constructor() {
    effect(() => {
      this.kickoffForm.controls.kickoffAt.setValue(toLocalDateTimeInputValue(this.match().kickoffAt), { emitEvent: false });
    });
  }

  protected confirm(): void {
    if (this.kickoffForm.invalid || this.isSubmitting()) {
      this.kickoffForm.markAllAsTouched();
      return;
    }

    const value = this.kickoffForm.getRawValue();
    const kickoffDate = new Date(value.kickoffAt);

    if (Number.isNaN(kickoffDate.getTime())) {
      this.kickoffForm.controls.kickoffAt.setErrors({ invalid: true });
      return;
    }

    this.confirmKickoffChange.emit({
      kickoffAt: kickoffDate.toISOString(),
      secretCode: value.secretCode
    });
  }

  protected cancel(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.cancelModal.emit();
  }
}

function toLocalDateTimeInputValue(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 16);
}
