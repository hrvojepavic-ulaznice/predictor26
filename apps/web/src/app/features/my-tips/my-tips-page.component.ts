import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatchWithPrediction } from '@models/match.models';
import { MatchesApiProvider } from '@services/providers/matches-api.provider';
import { MatchSortMode, MatchSortPreferenceService } from '@core/state/match-sort-preference.service';
import { MatchSortMenuComponent } from '@shared/components/match-sort-menu/match-sort-menu.component';
import { PredictionPointsComponent } from '@shared/components/prediction-points/prediction-points.component';
import { OddsFormatPipe } from '@shared/pipes/odds-format.pipe';
import { calculatePredictionPoints, getPredictionPointsStateColor } from '@shared/utils/prediction-points.utils';

interface TipGroup {
  readonly label: string;
  readonly sections: TipSection[];
}

interface TipSection {
  readonly label: string;
  readonly matches: MatchWithPrediction[];
}

@Component({
  selector: 'app-my-tips-page',
  imports: [DatePipe, MatchSortMenuComponent, OddsFormatPipe, PredictionPointsComponent, RouterLink],
  templateUrl: './my-tips-page.component.html',
  styleUrl: './my-tips-page.component.scss'
})
export class MyTipsPageComponent {
  private readonly matchesApi = inject(MatchesApiProvider);
  private readonly sortPreference = inject(MatchSortPreferenceService);

  protected readonly matches = signal<MatchWithPrediction[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly predictedMatches = computed(() => this.matches().filter((match) => match.prediction !== null));
  protected readonly groupedPredictedMatches = computed(() =>
    groupTips(this.predictedMatches(), this.sortPreference.sortMode())
  );

  constructor() {
    this.loadMatches();
  }

  protected matchStatus(match: MatchWithPrediction): string {
    if (match.finalScore) {
      return 'Finished';
    }

    if (Date.parse(match.kickoffAt) <= Date.now()) {
      return 'Ongoing';
    }

    return 'Upcoming';
  }

  protected predictionStateColor(match: MatchWithPrediction): string | null {
    if (!match.prediction) {
      return '#111827';
    }

    return getPredictionPointsStateColor(calculatePredictionPoints(match.prediction, match.finalScore).state) ?? '#111827';
  }

  private loadMatches(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.matchesApi.getMatches().subscribe({
      next: ({ matches }) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Your tips could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}

function groupTips(matches: readonly MatchWithPrediction[], sortMode: MatchSortMode): TipGroup[] {
  return sortMode === 'groups' ? groupTipsByGroups(matches) : groupTipsByRounds(matches);
}

function groupTipsByRounds(matches: readonly MatchWithPrediction[]): TipGroup[] {
  const groups = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    groups.set(match.predictionRound, [...(groups.get(match.predictionRound) ?? []), match]);
  }

  return Array.from(groups, ([label, groupedMatches]) => ({
    label,
    sections: groupByGroupName(groupedMatches)
  }));
}

function groupTipsByGroups(matches: readonly MatchWithPrediction[]): TipGroup[] {
  const groups = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    const label = match.groupName ? `Group ${match.groupName}` : match.roundLabel;
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }

  return Array.from(groups, ([label, groupedMatches]) => ({
    label,
    sections: groupByPredictionRound(groupedMatches)
  }));
}

function groupByGroupName(matches: readonly MatchWithPrediction[]): TipSection[] {
  const sections = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    const label = match.groupName ? `Group ${match.groupName}` : match.roundLabel;
    sections.set(label, [...(sections.get(label) ?? []), match]);
  }

  return Array.from(sections, ([label, sectionMatches]) => ({
    label,
    matches: sectionMatches
  }));
}

function groupByPredictionRound(matches: readonly MatchWithPrediction[]): TipSection[] {
  const sections = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    sections.set(match.predictionRound, [...(sections.get(match.predictionRound) ?? []), match]);
  }

  return Array.from(sections, ([label, sectionMatches]) => ({
    label,
    matches: sectionMatches
  }));
}
