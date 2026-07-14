import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { FinalResultsService } from '@services/final-results.service';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TooltipComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  protected readonly appState = inject(AppStateService);
  protected readonly finalResults = inject(FinalResultsService);
}
