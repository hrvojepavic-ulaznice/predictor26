import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { AppStateService } from '@core/state/app-state.service';
import { LeaderboardUser } from '@models/leaderboard.models';
import { LeaderboardService } from '@services/leaderboard.service';

export interface FinalResultsWinner {
  readonly place: 1 | 2 | 3;
  readonly user: LeaderboardUser;
  readonly prizePercent: number;
  readonly prizeAmount: number;
}

export interface FinalResults {
  readonly totalUsers: number;
  readonly totalPrizePool: number;
  readonly winners: FinalResultsWinner[];
}

const buyInEur = 25;
const prizeDistribution = [
  { place: 1, prizePercent: 60 },
  { place: 2, prizePercent: 30 },
  { place: 3, prizePercent: 10 }
] as const;
const seenStorageKeyPrefix = 'predictor26.final-results.seen';

@Injectable({
  providedIn: 'root'
})
export class FinalResultsService {
  private readonly appState = inject(AppStateService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly modalOpenSignal = signal(false);
  private readonly seenVersionSignal = signal(0);

  readonly modalOpen = this.modalOpenSignal.asReadonly();
  readonly results = computed<FinalResults | null>(() => {
    const leaderboard = this.leaderboardService.leaderboard();
    const matchDays = this.leaderboardService.matchDays();

    if (!leaderboard || !matchDays) {
      return null;
    }

    const matches = matchDays.flatMap((day) => day.matches);

    if (matches.length === 0 || matches.some((match) => match.status !== 'finished')) {
      return null;
    }

    const totalPrizePool = leaderboard.totalUsers * buyInEur;

    return {
      totalUsers: leaderboard.totalUsers,
      totalPrizePool,
      winners: prizeDistribution.flatMap((prize) => {
        const user = leaderboard.users[prize.place - 1];

        return user
          ? [
              {
                place: prize.place,
                user,
                prizePercent: prize.prizePercent,
                prizeAmount: totalPrizePool * (prize.prizePercent / 100)
              }
            ]
          : [];
      })
    };
  });
  readonly available = computed(() => this.results() !== null);
  readonly hasSeenAutomaticModal = computed(() => {
    this.seenVersionSignal();
    const userId = this.appState.currentUser()?.id;

    return userId ? localStorage.getItem(getSeenStorageKey(userId)) === '1' : true;
  });

  constructor() {
    effect(() => {
      if (this.available() && !this.hasSeenAutomaticModal()) {
        this.modalOpenSignal.set(true);
      }
    });
  }

  ensureFinalResults(): void {
    this.leaderboardService.ensureLeaderboard()?.subscribe();
    this.leaderboardService.ensureMatchDays()?.subscribe();
  }

  openFinalResults(): void {
    if (this.available()) {
      this.modalOpenSignal.set(true);
    }
  }

  closeFinalResults(): void {
    const userId = this.appState.currentUser()?.id;

    if (userId) {
      localStorage.setItem(getSeenStorageKey(userId), '1');
      this.seenVersionSignal.update((version) => version + 1);
    }

    this.modalOpenSignal.set(false);
  }
}

function getSeenStorageKey(userId: number): string {
  return `${seenStorageKeyPrefix}.${userId}`;
}
