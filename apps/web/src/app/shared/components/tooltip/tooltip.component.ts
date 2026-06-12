import { Component, Input } from '@angular/core';

export type TooltipPlacement = 'bottom' | 'left' | 'right' | 'top';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  @Input({ required: true }) text = '';
  @Input() placement: TooltipPlacement = 'bottom';
}
