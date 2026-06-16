import { Component, computed, inject, signal } from '@angular/core';

import {
  LeaderboardComingUpMatch,
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

interface RankedLeaderboardUser extends LeaderboardUser {
  readonly rank: number;
  readonly rankLabel: string;
  readonly liveMovementLabel: string;
  readonly liveMovementState: 'up' | 'down' | 'same';
  readonly showLiveMovement: boolean;
}

interface LeaderboardLiveMatchHeading extends LeaderboardLiveMatch {
  readonly label: string;
  readonly liveScoreLabel: string | null;
}

interface LeaderboardComingUpMatchHeading extends LeaderboardComingUpMatch {
  readonly label: string;
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

    return {
      ...leaderboard,
      liveMovementMatchId: leaderboard.liveMatches.find((match) => match.finalScore)?.matchId ?? null,
      liveMatches: leaderboard.liveMatches.map((match) => ({
        ...match,
        label: this.getMatchLabel(match),
        liveScoreLabel: match.finalScore ? `${match.finalScore.home}:${match.finalScore.away}` : null
      })),
      comingUpMatches: leaderboard.comingUpMatches.map((match) => ({
        ...match,
        label: this.getMatchLabel(match)
      })),
      rounds: leaderboard.rounds.map((round) => ({
        label: round.label,
        heading: this.getRoundHeading(round.label),
        locked: round.locked,
        viewable: round.viewable
      })),
      users: leaderboard.users.map((user) => {
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
          showLiveMovement: leaderboard.liveMatches.some((match) => match.finalScore) && user.liveRankMovement !== 0
        };
      })
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

  protected isOpeningRound(user: RankedLeaderboardUser, round: LeaderboardRound): boolean {
    return this.openingRoundKey() === this.getRoundKey(user.id, round.label);
  }

  protected formatPoints(points: number): string {
    return points === 0 ? '0' : points.toFixed(2);
  }

  private getMatchLabel(match: LeaderboardLiveMatch | LeaderboardComingUpMatch): string {
    return `${this.teamLabel(match.homeTeam)} - ${this.teamLabel(match.awayTeam)}`;
  }

  private teamLabel(team: LeaderboardLiveMatch['homeTeam'] | LeaderboardComingUpMatch['homeTeam']): string {
    const shortName = team.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

    return `${team.flag ?? ''} ${shortName || team.name.slice(0, 3).toUpperCase()}`.trim();
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
