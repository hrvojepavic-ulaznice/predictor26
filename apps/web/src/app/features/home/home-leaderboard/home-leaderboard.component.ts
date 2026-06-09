import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { LeaderboardResponse, LeaderboardRound, LeaderboardUser } from '@models/leaderboard.models';
import { AppStateService } from '@core/state/app-state.service';
import { LeaderboardService } from '@services/leaderboard.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { LeaderboardRoundModalComponent } from './leaderboard-round-modal.component';

interface RankedLeaderboardUser extends LeaderboardUser {
  readonly rank: number;
  readonly rankLabel: string;
}

interface LeaderboardRoundHeading {
  readonly label: string;
  readonly heading: string;
  readonly locked: boolean;
  readonly viewable: boolean;
}

interface RankedLeaderboardResponse extends Omit<LeaderboardResponse, 'rounds' | 'users'> {
  readonly rounds: LeaderboardRoundHeading[];
  readonly users: RankedLeaderboardUser[];
}

interface SelectedLeaderboardRound {
  readonly user: RankedLeaderboardUser;
  readonly round: LeaderboardRound;
}

@Component({
  selector: 'app-home-leaderboard',
  imports: [DecimalPipe, LeaderboardRoundModalComponent, ModalShellComponent],
  templateUrl: './home-leaderboard.component.html',
  styleUrl: './home-leaderboard.component.scss'
})
export class HomeLeaderboardComponent {
  private readonly appState = inject(AppStateService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly leaderboardResponse = this.leaderboardService.leaderboard;
  protected readonly isLoggedIn = this.appState.isLoggedIn;

  protected readonly leaderboard = computed<RankedLeaderboardResponse | null>(() => {
    const leaderboard = this.leaderboardResponse();

    if (!leaderboard) {
      return null;
    }

    return this.toRankedLeaderboard(leaderboard);
  });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
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
          rankLabel: this.getRankLabel(lastRank)
        };
      })
    };
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
    if (!this.isLoggedIn() || !round.viewable) {
      return;
    }

    this.selectedRound.set({ user, round });
  }

  protected closeRound(): void {
    this.selectedRound.set(null);
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
