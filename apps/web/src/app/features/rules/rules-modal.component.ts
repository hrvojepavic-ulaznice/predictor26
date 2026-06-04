import { Component, output } from '@angular/core';

@Component({
  selector: 'app-rules-modal',
  templateUrl: './rules-modal.component.html',
  styleUrl: './rules-modal.component.scss'
})
export class RulesModalComponent {
  readonly closeModal = output<void>();

  protected close(): void {
    this.closeModal.emit();
  }
}
