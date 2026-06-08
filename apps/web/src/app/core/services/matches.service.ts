import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import { MatchWithPrediction, MatchesResponse, SavePredictionRequest, SavePredictionResponse } from '@models/match.models';
import { LeaderboardService } from '@services/leaderboard.service';
import { MatchesApiProvider } from '@services/providers/matches-api.provider';

interface EnsureMatchesOptions {
  readonly force?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MatchesService {
  private readonly matchesApi = inject(MatchesApiProvider);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly matchesSignal = signal<MatchWithPrediction[]>([]);
  private readonly fullMatchesLoadedSignal = signal(false);
  private readonly predictedMatchesLoadedSignal = signal(false);

  readonly matches = this.matchesSignal.asReadonly();
  readonly predictedMatches = computed(() => this.matchesSignal().filter((match) => match.prediction !== null));
  readonly fullMatchesLoaded = this.fullMatchesLoadedSignal.asReadonly();

  ensureMatches(options: EnsureMatchesOptions = {}): Observable<MatchesResponse> | null {
    if (!options.force && this.fullMatchesLoadedSignal()) {
      return null;
    }

    return this.refreshMatches();
  }

  refreshMatches(): Observable<MatchesResponse> {
    return this.matchesApi.getMatches().pipe(
      tap(({ matches }) => {
        this.matchesSignal.set(matches);
        this.fullMatchesLoadedSignal.set(true);
        this.predictedMatchesLoadedSignal.set(true);
      })
    );
  }

  ensurePredictedMatches(options: EnsureMatchesOptions = {}): Observable<MatchesResponse> | null {
    if (!options.force && (this.fullMatchesLoadedSignal() || this.predictedMatchesLoadedSignal())) {
      return null;
    }

    return this.matchesApi.getPredictedMatches().pipe(
      tap(({ matches }) => {
        this.mergeMatches(matches);
        this.predictedMatchesLoadedSignal.set(true);
      })
    );
  }

  savePrediction(matchId: number, request: SavePredictionRequest): Observable<SavePredictionResponse> {
    return this.matchesApi.savePrediction(matchId, request).pipe(
      tap(({ prediction }) => {
        this.matchesSignal.update((matches) =>
          matches.map((match) =>
            match.id === matchId
              ? {
                  ...match,
                  prediction
                }
            : match
          )
        );
      }),
      switchMap((response) =>
        this.leaderboardService.refreshLeaderboard().pipe(
          catchError(() => of(null)),
          map(() => response)
        )
      )
    );
  }

  private mergeMatches(incomingMatches: readonly MatchWithPrediction[]): void {
    this.matchesSignal.update((matches) => {
      const matchesById = new Map(matches.map((match) => [match.id, match]));

      for (const match of incomingMatches) {
        matchesById.set(match.id, {
          ...matchesById.get(match.id),
          ...match
        });
      }

      return Array.from(matchesById.values()).sort((firstMatch, secondMatch) => firstMatch.matchNumber - secondMatch.matchNumber);
    });
  }
}
