import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { CompetitionsApiProvider } from '@services/providers/competitions-api.provider';

@Component({
  selector: 'app-rules-page',
  imports: [RouterLink],
  templateUrl: './rules-page.component.html',
  styleUrl: './rules-page.component.scss'
})
export class RulesPageComponent {
  private readonly appState = inject(AppStateService);
  private readonly competitionsApi = inject(CompetitionsApiProvider);

  protected readonly activeCompetition = this.appState.activeCompetition;
  protected readonly rules = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.competitionsApi.getCompetitionRules().subscribe({
      next: ({ rules }) => {
        this.rules.set(rules);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Competition rules could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}
