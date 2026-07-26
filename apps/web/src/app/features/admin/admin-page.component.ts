import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { Competition } from '@models/competition.models';
import { CompetitionsService } from '@services/competitions.service';

@Component({
  selector: 'app-admin-page',
  imports: [RouterLink],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss'
})
export class AdminPageComponent {
  private readonly appState = inject(AppStateService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly router = inject(Router);

  protected readonly activeCompetition = this.appState.activeCompetition;
  protected readonly competitions = this.competitionsService.competitions;
  protected readonly loadingCompetitions = signal(true);
  protected readonly competitionErrorMessage = signal<string | null>(null);

  constructor() {
    this.competitionsService.refreshAdminCompetitions().subscribe({
      next: ({ competitions }) => {
        this.loadingCompetitions.set(false);
      },
      error: () => {
        this.competitionErrorMessage.set('Competitions could not be loaded.');
        this.loadingCompetitions.set(false);
      }
    });
  }

  protected selectCompetition(competition: Competition): void {
    this.competitionsService.enterCompetition(competition);
    void this.router.navigate(['/admin/competition', competition.slug]);
  }
}
