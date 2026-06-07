import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { LeaderboardResponse } from '@models/leaderboard.models';
import { LeaderboardApiProvider } from '@services/providers/leaderboard-api.provider';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private readonly leaderboardApi = inject(LeaderboardApiProvider);
  private readonly leaderboardSignal = signal<LeaderboardResponse | null>(null);
  private readonly loadedSignal = signal(false);

  readonly leaderboard = this.leaderboardSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  ensureLeaderboard(): Observable<LeaderboardResponse> | null {
    if (this.loadedSignal()) {
      return null;
    }

    return this.refreshLeaderboard();
  }

  refreshLeaderboard(): Observable<LeaderboardResponse> {
    return this.leaderboardApi.getLeaderboard().pipe(
      tap((leaderboard) => {
        this.leaderboardSignal.set(leaderboard);
        this.loadedSignal.set(true);
      })
    );
  }
}
