import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { LeaderboardService } from '@services/leaderboard.service';
import { MatchesService } from '@services/matches.service';

@Injectable({
  providedIn: 'root'
})
export class SessionDataRefreshService {
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly matchesService = inject(MatchesService);

  refreshAfterSessionChange(): Observable<void> {
    return forkJoin([
      this.matchesService.ensureMatches({ force: true })?.pipe(catchError(() => of(null))) ?? of(null),
      this.leaderboardService.ensureLeaderboard({ force: true })?.pipe(catchError(() => of(null))) ?? of(null)
    ]).pipe(map(() => undefined));
  }
}
