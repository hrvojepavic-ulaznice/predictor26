import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { LeaderboardResponse } from '@models/leaderboard.models';
import { LeaderboardApiProvider } from '@services/providers/leaderboard-api.provider';

@Component({
  selector: 'app-home-leaderboard',
  imports: [DecimalPipe],
  templateUrl: './home-leaderboard.component.html',
  styleUrl: './home-leaderboard.component.scss'
})
export class HomeLeaderboardComponent {
  private readonly leaderboardApi = inject(LeaderboardApiProvider);

  protected readonly leaderboard = signal<LeaderboardResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadLeaderboard();
  }

  private loadLeaderboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.leaderboardApi.getLeaderboard().subscribe({
      next: (leaderboard) => {
        this.leaderboard.set(leaderboard);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Leaderboard could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}
