import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { MatchPrediction, MatchScore } from '@models/match.models';
import { formatFixedNumber } from '@shared/utils/number-format.utils';
import { calculatePredictionPoints, getPredictionPointsStateColor } from '@shared/utils/prediction-points.utils';

@Component({
  selector: 'app-prediction-points',
  imports: [DecimalPipe],
  templateUrl: './prediction-points.component.html',
  styleUrl: './prediction-points.component.scss'
})
export class PredictionPointsComponent {
  readonly prediction = input.required<MatchPrediction>();
  readonly finalScore = input<MatchScore | null>(null);
  readonly isPostponed = input(false);

  protected readonly points = computed(() => calculatePredictionPoints(this.prediction(), this.finalScore(), this.isPostponed()));
  protected readonly color = computed(() => getPredictionPointsStateColor(this.points().state));
  protected readonly title = computed(() => {
    const points = this.points();

    if (points.state === 'void') {
      return 'Postponed match. Prediction is void.';
    }

    return `Correct outcome ${formatFixedNumber(points.outcomePoints)} + Correct score ${formatFixedNumber(points.exactScorePoints)} = ${formatFixedNumber(points.available ?? 0)}`;
  });
}
