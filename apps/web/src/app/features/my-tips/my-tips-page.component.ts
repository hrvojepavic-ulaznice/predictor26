import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatchWithPrediction } from '@models/match.models';
import { MatchesApiProvider } from '@services/providers/matches-api.provider';
import { PredictionPointsComponent } from '@shared/components/prediction-points/prediction-points.component';
import { OddsFormatPipe } from '@shared/pipes/odds-format.pipe';
import { calculatePredictionPoints, getPredictionPointsStateColor } from '@shared/utils/prediction-points.utils';

@Component({
  selector: 'app-my-tips-page',
  imports: [DatePipe, OddsFormatPipe, PredictionPointsComponent, RouterLink],
  templateUrl: './my-tips-page.component.html',
  styleUrl: './my-tips-page.component.scss'
})
export class MyTipsPageComponent {
  private readonly matchesApi = inject(MatchesApiProvider);

  protected readonly matches = signal<MatchWithPrediction[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly predictedMatches = computed(() => this.matches().filter((match) => match.prediction !== null));

  constructor() {
    this.loadMatches();
  }

  protected matchStatus(match: MatchWithPrediction): string {
    if (match.finalScore) {
      return 'Finished';
    }

    if (Date.parse(match.kickoffAt) <= Date.now()) {
      return 'Ongoing';
    }

    return 'Upcoming';
  }

  protected predictionStateColor(match: MatchWithPrediction): string | null {
    if (!match.prediction) {
      return '#111827';
    }

    return getPredictionPointsStateColor(calculatePredictionPoints(match.prediction, match.finalScore).state) ?? '#111827';
  }

  private loadMatches(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.matchesApi.getMatches().subscribe({
      next: ({ matches }) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Your tips could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}
