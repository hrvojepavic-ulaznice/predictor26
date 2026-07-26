import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';

import {
  LeaderboardMatchDay,
  LeaderboardMatchDaysResponse,
  LeaderboardMatchPredictionsResponse,
  LeaderboardResponse,
  LeaderboardRoundDetails,
  LeaderboardStatsResponse,
  LeaderboardUserRoundDetailsResponse
} from '@models/leaderboard.models';
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
  private readonly matchDaysSignal = signal<LeaderboardMatchDay[] | null>(null);
  private readonly loadedSignal = signal(false);
  private readonly matchDaysLoadedSignal = signal(false);
  private readonly statsSignal = signal<LeaderboardStatsResponse | null>(null);
  private readonly statsLoadedSignal = signal(false);
  private leaderboardRequest: Observable<LeaderboardResponse> | null = null;
  private readonly roundDetailsCache = new Map<string, LeaderboardRoundDetails>();
  private readonly matchPredictionsCache = new Map<number, LeaderboardMatchPredictionsResponse>();

  readonly leaderboard = this.leaderboardSignal.asReadonly();
  readonly matchDays = this.matchDaysSignal.asReadonly();
  readonly stats = this.statsSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  ensureLeaderboard(options: EnsureLeaderboardOptions = {}): Observable<LeaderboardResponse> | null {
    if (!options.force && this.loadedSignal()) {
      return null;
    }

    if (this.leaderboardRequest) {
      return this.leaderboardRequest;
    }

    this.leaderboardRequest = this.refreshLeaderboard().pipe(
      finalize(() => {
        this.leaderboardRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.leaderboardRequest;
  }

  ensureMatchDays(options: EnsureLeaderboardOptions = {}): Observable<LeaderboardMatchDaysResponse> | null {
    if (!options.force && this.matchDaysLoadedSignal()) {
      return null;
    }

    return this.leaderboardApi.getMatchDays().pipe(
      tap(({ days }) => {
        this.matchDaysSignal.set(days);
        this.matchDaysLoadedSignal.set(true);
      })
    );
  }

  ensureStats(options: EnsureLeaderboardOptions = {}): Observable<LeaderboardStatsResponse> | null {
    if (!options.force && this.statsLoadedSignal()) {
      return null;
    }

    return this.leaderboardApi.getStats().pipe(
      tap((stats) => {
        this.statsSignal.set(stats);
        this.statsLoadedSignal.set(true);
      })
    );
  }

  refreshLeaderboard(): Observable<LeaderboardResponse> {
    return this.leaderboardApi.getLeaderboard().pipe(
      tap((leaderboard) => {
        this.leaderboardSignal.set(leaderboard);
        this.loadedSignal.set(true);
        this.roundDetailsCache.clear();
        this.statsLoadedSignal.set(false);
        this.statsSignal.set(null);
      })
    );
  }

  ensureMatchPredictions(matchId: number): Observable<LeaderboardMatchPredictionsResponse> {
    const cachedPredictions = this.matchPredictionsCache.get(matchId);

    if (cachedPredictions) {
      return of(cachedPredictions);
    }

    return this.leaderboardApi.getMatchPredictions(matchId).pipe(
      tap((response) => {
        this.matchPredictionsCache.set(matchId, response);
      })
    );
  }

  ensureUserRoundDetails(userId: number, roundLabel: string): Observable<LeaderboardUserRoundDetailsResponse> {
    const cacheKey = this.getRoundDetailsCacheKey(userId, roundLabel);
    const cachedRound = this.roundDetailsCache.get(cacheKey);

    if (cachedRound) {
      return of({ round: cachedRound });
    }

    return this.leaderboardApi.getUserRoundDetails(userId, roundLabel).pipe(
      tap(({ round }) => {
        this.roundDetailsCache.set(cacheKey, round);
      })
    );
  }

  recordPredictionSaved(userId: number, roundLabel: string, hadPredictionBefore: boolean): void {
    if (!hadPredictionBefore) {
      this.leaderboardSignal.update((leaderboard) => {
        if (!leaderboard) {
          return leaderboard;
        }

        return {
          ...leaderboard,
          users: leaderboard.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  rounds: user.rounds.map((round) =>
                    round.label === roundLabel
                      ? {
                          ...round,
                          submittedCount: Math.min(round.expectedCount, round.submittedCount + 1)
                        }
                      : round
                  )
                }
              : user
          )
        };
      });
    }

    this.roundDetailsCache.delete(this.getRoundDetailsCacheKey(userId, roundLabel));
    this.matchPredictionsCache.clear();
    this.statsLoadedSignal.set(false);
    this.statsSignal.set(null);
  }

  clearCompetitionData(): void {
    this.leaderboardRequest = null;
    this.leaderboardSignal.set(null);
    this.matchDaysSignal.set(null);
    this.loadedSignal.set(false);
    this.matchDaysLoadedSignal.set(false);
    this.statsSignal.set(null);
    this.statsLoadedSignal.set(false);
    this.roundDetailsCache.clear();
    this.matchPredictionsCache.clear();
  }

  private getRoundDetailsCacheKey(userId: number, roundLabel: string): string {
    return `${userId}:${roundLabel}`;
  }
}
