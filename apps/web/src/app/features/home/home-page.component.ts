import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { MatchWithPrediction } from '@models/match.models';
import { MatchesApiProvider } from '@services/providers/matches-api.provider';
import { HomeLeaderboardComponent } from './home-leaderboard/home-leaderboard.component';

interface NextPredictionDeadline {
  readonly label: string;
  readonly remaining: string;
}

@Component({
  selector: 'app-home-page',
  imports: [HomeLeaderboardComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  private readonly appState = inject(AppStateService);
  private readonly matchesApi = inject(MatchesApiProvider);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly matches = signal<MatchWithPrediction[]>([]);
  protected readonly now = signal(Date.now());
  protected readonly nextPredictionDeadline = computed<NextPredictionDeadline | null>(() => {
    const now = this.now();
    const nextGroup = getPredictionGroups(this.matches())
      .filter((group) => Date.parse(group.deadlineAt) > now)
      .sort((firstGroup, secondGroup) => Date.parse(firstGroup.deadlineAt) - Date.parse(secondGroup.deadlineAt))[0];

    if (!nextGroup) {
      return null;
    }

    return {
      label: getPredictionRoundLabel(nextGroup.label),
      remaining: getTimeRemaining(nextGroup.deadlineAt, now)
    };
  });

  constructor() {
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(Date.now());
      });

    if (this.appState.isLoggedIn()) {
      this.loadMatches();
    }
  }

  private loadMatches(): void {
    this.matchesApi.getMatches().subscribe({
      next: ({ matches }) => {
        this.matches.set(matches);
      },
      error: () => {
        this.matches.set([]);
      }
    });
  }
}

function getPredictionGroups(
  matches: readonly MatchWithPrediction[]
): Array<{ readonly label: string; readonly deadlineAt: string }> {
  const groups = new Map<string, string>();

  for (const match of matches) {
    const currentDeadline = groups.get(match.predictionRound);

    if (!currentDeadline || Date.parse(match.predictionDeadlineAt) < Date.parse(currentDeadline)) {
      groups.set(match.predictionRound, match.predictionDeadlineAt);
    }
  }

  return Array.from(groups, ([label, deadlineAt]) => ({
    label,
    deadlineAt
  }));
}

function getPredictionRoundLabel(label: string): string {
  const labels = new Map<string, string>([
    ['Group stage - Round 1', 'Round 1'],
    ['Group stage - Round 2', 'Round 2'],
    ['Group stage - Round 3', 'Round 3']
  ]);

  return labels.get(label) ?? label;
}

function getTimeRemaining(deadlineAt: string, now: number): string {
  const remainingMs = Date.parse(deadlineAt) - now;

  if (remainingMs <= 0) {
    return 'closed';
  }

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
