import { Component, computed, inject, signal } from '@angular/core';

import {
  LeaderboardComingUpMatch,
  LeaderboardLivePrediction,
  LeaderboardLiveMatch,
  LeaderboardResponse,
  LeaderboardRound,
  LeaderboardRoundDetails,
  LeaderboardUser
} from '@models/leaderboard.models';
import { AppStateService } from '@core/state/app-state.service';
import { LeaderboardService } from '@services/leaderboard.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { LeaderboardRoundModalComponent } from './leaderboard-round-modal.component';

interface LeaderboardLivePredictionView extends LeaderboardLivePrediction {
  readonly matchesLiveScore: boolean;
}

interface RankedLeaderboardUser extends Omit<LeaderboardUser, 'livePredictions'> {
  readonly rank: number;
  readonly rankLabel: string;
  readonly highlightRank: boolean;
  readonly liveMovementLabel: string;
  readonly liveMovementState: 'up' | 'down' | 'same';
  readonly showLiveMovement: boolean;
  readonly livePredictions: LeaderboardLivePredictionView[];
}

interface LeaderboardLiveMatchHeading extends LeaderboardLiveMatch {
  readonly homeTeamDisplay: LeaderboardTeamHeading;
  readonly awayTeamDisplay: LeaderboardTeamHeading;
  readonly liveScoreLabel: string | null;
}

interface LeaderboardComingUpMatchHeading extends LeaderboardComingUpMatch {
  readonly homeTeamDisplay: LeaderboardTeamHeading;
  readonly awayTeamDisplay: LeaderboardTeamHeading;
}

interface LeaderboardTeamHeading {
  readonly name: string;
  readonly shortLabel: string;
  readonly iconUrl: string | null;
}

interface LeaderboardRoundHeading {
  readonly label: string;
  readonly heading: string;
  readonly locked: boolean;
  readonly viewable: boolean;
}

interface RankedLeaderboardResponse extends Omit<LeaderboardResponse, 'comingUpMatches' | 'liveMatches' | 'rounds' | 'users'> {
  readonly liveMatches: LeaderboardLiveMatchHeading[];
  readonly comingUpMatches: LeaderboardComingUpMatchHeading[];
  readonly rounds: LeaderboardRoundHeading[];
  readonly users: RankedLeaderboardUser[];
  readonly liveMovementMatchId: number | null;
  readonly showWinnerColumn: boolean;
  readonly showInterimTotalColumn: boolean;
}

interface SelectedLeaderboardRound {
  readonly user: RankedLeaderboardUser;
  readonly round: LeaderboardRoundDetails;
}

@Component({
  selector: 'app-home-leaderboard',
  imports: [LeaderboardRoundModalComponent, ModalShellComponent],
  templateUrl: './home-leaderboard.component.html',
  styleUrl: './home-leaderboard.component.scss'
})
export class HomeLeaderboardComponent {
  private readonly appState = inject(AppStateService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly leaderboardResponse = this.leaderboardService.leaderboard;
  protected readonly isLoggedIn = this.appState.isLoggedIn;
  protected readonly currentUserId = computed(() => this.appState.currentUser()?.id ?? null);

  protected readonly leaderboard = computed<RankedLeaderboardResponse | null>(() => {
    const leaderboard = this.leaderboardResponse();

    if (!leaderboard) {
      return null;
    }

    return this.toRankedLeaderboard(leaderboard);
  });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly openingRoundKey = signal<string | null>(null);
  protected readonly selectedRound = signal<SelectedLeaderboardRound | null>(null);
  protected readonly isHorizontallyScrolled = signal(false);

  constructor() {
    this.loadLeaderboard();
  }

  private loadLeaderboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const request = this.leaderboardService.ensureLeaderboard();

    if (!request) {
      this.loading.set(false);
      return;
    }

    request.subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Leaderboard could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private toRankedLeaderboard(leaderboard: LeaderboardResponse): RankedLeaderboardResponse {
    let lastPoints: number | null = null;
    let lastRank = 0;
    const liveScoresByMatchId = new Map(leaderboard.liveMatches.map((match) => [match.matchId, match.finalScore]));
    const rankedUsers = leaderboard.users.map((user) => {
      if (lastPoints === null || user.totalPoints !== lastPoints) {
        lastRank += 1;
        lastPoints = user.totalPoints;
      }

      return {
        ...user,
        rank: lastRank,
        rankLabel: this.getRankLabel(lastRank),
        liveMovementLabel: this.getLiveMovementLabel(user.liveRankMovement),
        liveMovementState: this.getLiveMovementState(user.liveRankMovement),
        showLiveMovement: leaderboard.liveMatches.some((match) => match.finalScore) && user.liveRankMovement !== 0,
        livePredictions: user.livePredictions.map((livePrediction) => {
          const liveScore = liveScoresByMatchId.get(livePrediction.matchId);

          return {
            ...livePrediction,
            matchesLiveScore:
              livePrediction.prediction !== null &&
              liveScore !== null &&
              liveScore !== undefined &&
              livePrediction.prediction.home === liveScore.home &&
              livePrediction.prediction.away === liveScore.away
          };
        })
      };
    });
    const allUsersSameRank = rankedUsers.length > 1 && rankedUsers.every((user) => user.rank === rankedUsers[0].rank);

    return {
      ...leaderboard,
      liveMovementMatchId: leaderboard.liveMatches.find((match) => match.finalScore)?.matchId ?? null,
      showWinnerColumn: leaderboard.rounds[0]?.locked === true,
      showInterimTotalColumn: leaderboard.rounds.length > 1,
      liveMatches: leaderboard.liveMatches.map((match) => ({
        ...match,
        homeTeamDisplay: this.getTeamHeading(match.homeTeam),
        awayTeamDisplay: this.getTeamHeading(match.awayTeam),
        liveScoreLabel: match.finalScore ? `${match.finalScore.home}:${match.finalScore.away}` : null
      })),
      comingUpMatches: leaderboard.comingUpMatches.map((match) => ({
        ...match,
        homeTeamDisplay: this.getTeamHeading(match.homeTeam),
        awayTeamDisplay: this.getTeamHeading(match.awayTeam)
      })),
      rounds: leaderboard.rounds.map((round) => ({
        label: round.label,
        heading: this.getRoundHeading(round.label),
        locked: round.locked,
        viewable: round.viewable
      })),
      users: rankedUsers.map((user) => ({
        ...user,
        highlightRank: user.rank <= 3 && !allUsersSameRank
      }))
    };
  }

  private getLiveMovementLabel(movement: number): string {
    return movement === 0 ? '' : String(Math.abs(movement));
  }

  private getLiveMovementState(movement: number): RankedLeaderboardUser['liveMovementState'] {
    if (movement > 0) {
      return 'up';
    }

    if (movement < 0) {
      return 'down';
    }

    return 'same';
  }

  private getRankLabel(rank: number): string {
    const lastTwoDigits = rank % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${rank}th`;
    }

    const suffixes = new Map<number, string>([
      [1, 'st'],
      [2, 'nd'],
      [3, 'rd']
    ]);

    return `${rank}${suffixes.get(rank % 10) ?? 'th'}`;
  }

  protected openRound(user: RankedLeaderboardUser, round: LeaderboardRound): void {
    if (!this.isLoggedIn() || !round.viewable || this.openingRoundKey()) {
      return;
    }

    const roundKey = this.getRoundKey(user.id, round.label);
    this.openingRoundKey.set(roundKey);
    this.errorMessage.set(null);

    this.leaderboardService.ensureUserRoundDetails(user.id, round.label).subscribe({
      next: ({ round: roundDetails }) => {
        this.selectedRound.set({ user, round: roundDetails });
        this.openingRoundKey.set(null);
      },
      error: () => {
        this.errorMessage.set('Round tips could not be loaded.');
        this.openingRoundKey.set(null);
      }
    });
  }

  protected closeRound(): void {
    this.selectedRound.set(null);
  }

  protected onTableScroll(event: Event): void {
    const scrollShell = event.currentTarget as HTMLElement | null;

    this.isHorizontallyScrolled.set((scrollShell?.scrollLeft ?? 0) > 0);
  }

  protected isOpeningRound(user: RankedLeaderboardUser, round: LeaderboardRound): boolean {
    return this.openingRoundKey() === this.getRoundKey(user.id, round.label);
  }

  protected formatPoints(points: number): string {
    return points === 0 ? '0' : points.toFixed(2);
  }

  protected isImageTeamFlag(flag: string | null): boolean {
    return typeof flag === 'string' && /^(?:https:\/\/|\/)/i.test(flag);
  }

  private getTeamHeading(team: LeaderboardLiveMatch['homeTeam'] | LeaderboardComingUpMatch['homeTeam']): LeaderboardTeamHeading {
    const shortName = team.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      name: team.name,
      shortLabel: shortName || team.name.slice(0, 2).toUpperCase(),
      iconUrl: this.isImageTeamFlag(team.flag) ? team.flag : null
    };
  }

  private getRoundKey(userId: number, roundLabel: string): string {
    return `${userId}:${roundLabel}`;
  }

  private getRoundHeading(round: string): string {
    const headings = new Map<string, string>([
      ['Group stage - Round 1', 'Round 1'],
      ['Group stage - Round 2', 'Round 2'],
      ['Group stage - Round 3', 'Round 3'],
      ['Round of 32', '1/16'],
      ['Round of 16', '1/8'],
      ['Quarter-finals', 'QF'],
      ['Semi-finals', 'SF'],
      ['Third-place play-off', 'Bronze'],
      ['Final', 'Final']
    ]);

    return headings.get(round) ?? round;
  }
}
