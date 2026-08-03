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
  readonly isCompetitionFinished: boolean;
  readonly roundLabel: string | null;
  readonly totalUsers: number;
  readonly totalPrizePool: number;
  readonly winners: FinalResultsWinner[];
  readonly pelinkovacUser: LeaderboardUser | null;
}

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
    const competition = this.appState.activeCompetition();

    if (!leaderboard || !matchDays || !competition) {
      return null;
    }

    const matches = matchDays.flatMap((day) => day.matches);

    if (matches.length === 0 || matches.some((match) => match.status !== 'finished')) {
      return null;
    }

    const totalPrizePool = leaderboard.totalUsers * competition.buyInEur;

    return {
      isCompetitionFinished: competition.isFinished,
      roundLabel: getLatestRoundLabel(matches),
      totalUsers: leaderboard.totalUsers,
      totalPrizePool,
      pelinkovacUser: findPelinkovacUser(leaderboard.users),
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
    const competitionId = this.appState.activeCompetition()?.id;

    return userId && competitionId ? localStorage.getItem(getSeenStorageKey(userId, competitionId)) === '1' : true;
  });

  constructor() {
    effect(() => {
      if (this.results()?.isCompetitionFinished && !this.hasSeenAutomaticModal()) {
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
    const competitionId = this.appState.activeCompetition()?.id;
    const isCompetitionFinished = this.results()?.isCompetitionFinished ?? false;

    if (userId && competitionId && isCompetitionFinished) {
      localStorage.setItem(getSeenStorageKey(userId, competitionId), '1');
      this.seenVersionSignal.update((version) => version + 1);
    }

    this.modalOpenSignal.set(false);
  }
}

function getSeenStorageKey(userId: number, competitionId: number): string {
  return `${seenStorageKeyPrefix}.${competitionId}.${userId}`;
}

function findPelinkovacUser(users: readonly LeaderboardUser[]): LeaderboardUser | null {
  for (let index = users.length - 2; index >= 0; index -= 1) {
    const user = users[index];

    if (user.rounds.every((round) => round.submittedCount === round.expectedCount)) {
      return user;
    }
  }

  return null;
}

function getLatestRoundLabel(matches: ReadonlyArray<{ readonly kickoffAt: string; readonly roundLabel: string }>): string | null {
  const latestMatch = [...matches].sort((firstMatch, secondMatch) => Date.parse(secondMatch.kickoffAt) - Date.parse(firstMatch.kickoffAt))[0];

  return latestMatch?.roundLabel ?? null;
}
