import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { LeaderboardResponse } from '@models/leaderboard.models';
import { LeaderboardApiProvider } from '@services/providers/leaderboard-api.provider';

interface EnsureLeaderboardOptions {
  readonly force?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private readonly leaderboardApi = inject(LeaderboardApiProvider);
  private readonly leaderboardSignal = signal<LeaderboardResponse | null>(null);
  private readonly loadedSignal = signal(false);

  readonly leaderboard = this.leaderboardSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  ensureLeaderboard(options: EnsureLeaderboardOptions = {}): Observable<LeaderboardResponse> | null {
    if (!options.force && this.loadedSignal()) {
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
