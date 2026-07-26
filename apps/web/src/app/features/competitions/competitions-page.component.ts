import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { Competition } from '@models/competition.models';
import { CompetitionsService } from '@services/competitions.service';

@Component({
  selector: 'app-competitions-page',
  templateUrl: './competitions-page.component.html',
  styleUrl: './competitions-page.component.scss'
})
export class CompetitionsPageComponent {
  private readonly competitionsService = inject(CompetitionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly competitions = this.competitionsService.competitions;
  protected readonly loaded = this.competitionsService.loaded;
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.competitionsService.exitCompetition();
    this.competitionsService
      .refreshCompetitions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ competitions }) => {
          const activeCompetitions = competitions.filter((competition) => !competition.isFinished);

          if (activeCompetitions.length === 1) {
            this.enterCompetition(activeCompetitions[0]);
          }
        },
        error: () => {
          this.errorMessage.set('Competitions could not be loaded.');
        }
      });
  }

  protected enterCompetition(competition: Competition): void {
    this.competitionsService.enterCompetition(competition);
    void this.router.navigate(['/competition', competition.slug]);
  }
}
