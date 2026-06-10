import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { MatchWithPrediction } from '@models/match.models';
import { MatchesService } from '@services/matches.service';
import { PaymentsService } from '@services/payments.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { HomeLeaderboardComponent } from './home-leaderboard/home-leaderboard.component';
import { PaymentInfoModalComponent } from './payment-info-modal.component';

interface NextPredictionDeadline {
  readonly label: string;
  readonly remaining: string;
}

@Component({
  selector: 'app-home-page',
  imports: [HomeLeaderboardComponent, ModalShellComponent, PaymentInfoModalComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  private readonly appState = inject(AppStateService);
  private readonly matchesService = inject(MatchesService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly matches = this.matchesService.matches;
  protected readonly paymentInfo = this.paymentsService.paymentInfo;
  protected readonly paymentModalOpen = signal(false);
  protected readonly showPaymentNotice = computed(
    () => this.appState.isLoggedIn() && !this.appState.currentUser()?.isVerified && this.paymentInfo()?.visible === true
  );
  protected readonly now = signal(Date.now());
  protected readonly nextPredictionDeadline = computed<NextPredictionDeadline | null>(() => {
    const now = this.now();
    const nextGroup = getNextPredictionGroup(this.matches(), now);

    if (!nextGroup) {
      return null;
    }

    return {
      label: getPredictionRoundLabel(nextGroup.label),
      remaining: getTimeRemaining(nextGroup.deadlineAt, now)
    };
  });
  protected readonly remainingPredictionsCount = computed(() => {
    const nextGroup = getNextPredictionGroup(this.matches(), this.now());

    if (!nextGroup) {
      return 0;
    }

    return this.matches().filter((match) => match.predictionRound === nextGroup.label && match.prediction === null).length;
  });

  constructor() {
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(Date.now());
      });

    if (this.appState.isLoggedIn()) {
      this.loadMatches();

      if (!this.appState.currentUser()?.isVerified) {
        this.loadPaymentInfo();
      }
    }
  }

  protected openPaymentModal(): void {
    this.paymentModalOpen.set(true);
  }

  protected closePaymentModal(): void {
    this.paymentModalOpen.set(false);
  }

  private loadMatches(): void {
    this.matchesService.ensureMatches()?.subscribe();
  }

  private loadPaymentInfo(): void {
    this.paymentsService.ensurePaymentInfo().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
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

function getNextPredictionGroup(
  matches: readonly MatchWithPrediction[],
  now: number
): { readonly label: string; readonly deadlineAt: string } | null {
  return (
    getPredictionGroups(matches)
      .filter((group) => Date.parse(group.deadlineAt) > now)
      .sort((firstGroup, secondGroup) => Date.parse(firstGroup.deadlineAt) - Date.parse(secondGroup.deadlineAt))[0] ?? null
  );
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
