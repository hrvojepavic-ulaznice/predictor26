import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatchWithPrediction } from '@models/match.models';
import { MatchesApiProvider } from '@services/providers/matches-api.provider';

@Component({
  selector: 'app-my-tips-page',
  imports: [DatePipe, DecimalPipe, RouterLink],
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
