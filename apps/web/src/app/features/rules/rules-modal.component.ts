import { Component, output } from '@angular/core';

import { PREDICTOR_RULES } from './rules.constants';

@Component({
  selector: 'app-rules-modal',
  templateUrl: './rules-modal.component.html',
  styleUrl: './rules-modal.component.scss'
})
export class RulesModalComponent {
  readonly closeModal = output<void>();
  protected readonly rules = PREDICTOR_RULES;

  protected close(): void {
    this.closeModal.emit();
  }
}
