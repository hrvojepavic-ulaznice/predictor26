import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { FinalResults, FinalResultsWinner } from '@services/final-results.service';

@Component({
  selector: 'app-final-results-modal',
  imports: [DecimalPipe],
  templateUrl: './final-results-modal.component.html',
  styleUrl: './final-results-modal.component.scss'
})
export class FinalResultsModalComponent {
  readonly results = input.required<FinalResults>();
  readonly closeModal = output<void>();

  protected readonly podiumWinners = computed(() => {
    const winners = this.results().winners;

    return [findWinner(winners, 2), findWinner(winners, 1), findWinner(winners, 3)].filter(
      (winner): winner is FinalResultsWinner => winner !== null
    );
  });

  protected readonly poolLabel = computed(() => this.formatCurrency(this.results().totalPrizePool));

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  }

  protected placeLabel(place: FinalResultsWinner['place']): string {
    const labels = new Map<FinalResultsWinner['place'], string>([
      [1, '1st'],
      [2, '2nd'],
      [3, '3rd']
    ]);

    return labels.get(place) ?? `${place}`;
  }
}

function findWinner(winners: readonly FinalResultsWinner[], place: FinalResultsWinner['place']): FinalResultsWinner | null {
  return winners.find((winner) => winner.place === place) ?? null;
}
