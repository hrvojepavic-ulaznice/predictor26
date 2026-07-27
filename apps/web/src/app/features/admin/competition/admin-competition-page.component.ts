import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';

@Component({
  selector: 'app-admin-competition-page',
  imports: [RouterLink],
  templateUrl: './admin-competition-page.component.html',
  styleUrl: './admin-competition-page.component.scss'
})
export class AdminCompetitionPageComponent {
  private readonly appState = inject(AppStateService);

  protected readonly activeCompetition = this.appState.activeCompetition;
}
