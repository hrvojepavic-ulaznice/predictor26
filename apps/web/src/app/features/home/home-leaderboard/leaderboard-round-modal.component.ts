import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { LeaderboardRound, LeaderboardRoundMatch, LeaderboardUser } from '@models/leaderboard.models';
import { getPredictionPointsStateColor } from '@shared/utils/prediction-points.utils';

@Component({
  selector: 'app-leaderboard-round-modal',
  imports: [DecimalPipe],
  templateUrl: './leaderboard-round-modal.component.html',
  styleUrl: './leaderboard-round-modal.component.scss'
})
export class LeaderboardRoundModalComponent {
  readonly user = input.required<LeaderboardUser>();
  readonly round = input.required<LeaderboardRound>();

  readonly closeModal = output<void>();

  protected close(): void {
    this.closeModal.emit();
  }

  protected pointsColor(match: LeaderboardRoundMatch): string | null {
    return getPredictionPointsStateColor(match.points.state);
  }
}
