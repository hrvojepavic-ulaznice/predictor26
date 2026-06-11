import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { MatchWithPrediction } from '@models/match.models';
import { MatchesService } from '@services/matches.service';
import { MatchSortMode, MatchSortPreferenceService } from '@core/state/match-sort-preference.service';
import { MatchSortMenuComponent } from '@shared/components/match-sort-menu/match-sort-menu.component';
import { PredictionPointsComponent } from '@shared/components/prediction-points/prediction-points.component';
import { OddsFormatPipe } from '@shared/pipes/odds-format.pipe';
import {
  calculatePredictionPoints,
  getPredictionPointsStateColor,
  PredictionPointsState
} from '@shared/utils/prediction-points.utils';
import { isValidScore, ScoreDraft, updateScoreDraft } from '@shared/utils/score-draft.utils';

interface MatchGroup {
  readonly label: string;
  readonly savedCount: number;
  readonly totalCount: number;
  readonly deadlineAt: string | null;
  readonly locked: boolean | null;
  readonly sections: MatchSection[];
}

interface MatchSection {
  readonly label: string;
  readonly matches: MatchWithPrediction[];
}

@Component({
  selector: 'app-predictions-page',
  imports: [DatePipe, MatchSortMenuComponent, OddsFormatPipe, PredictionPointsComponent],
  templateUrl: './predictions-page.component.html',
  styleUrl: './predictions-page.component.scss'
})
export class PredictionsPageComponent {
  private readonly matchesService = inject(MatchesService);
  private readonly sortPreference = inject(MatchSortPreferenceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly matches = this.matchesService.matches;
  protected readonly drafts = signal<Record<number, ScoreDraft>>({});
  protected readonly loading = signal(true);
  protected readonly savingIds = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastSavedMessage = signal<string | null>(null);
  protected readonly activeProgressLabel = signal<string | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly openMatches = computed(() =>
    this.matches().filter((match) => isPredictionOpen(match, this.now()))
  );
  protected readonly groupedMatches = computed(() => groupMatches(this.openMatches(), this.sortPreference.sortMode()));
  protected readonly closedRoundSummaries = computed(() =>
    groupMatchesByRounds(this.matches()).filter((group) => isPredictionGroupClosed(group, this.now()))
  );
  protected readonly progressGroups = computed(() => groupMatches(this.openMatches(), 'rounds'));
  protected readonly activeProgress = computed(() => {
    const groups = this.progressGroups();
    const activeLabel = this.activeProgressLabel();
    const group =
      groups.find((currentGroup) => currentGroup.label === activeLabel) ??
      groups.find((currentGroup) => !currentGroup.locked);

    if (!group) {
      return null;
    }

    return {
      ...group,
      complete: group.savedCount === group.totalCount && group.totalCount > 0
    };
  });
  private readonly saveTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(Date.now());
      });

    this.loadMatches();
  }

  protected updateDraft(matchId: number, side: keyof ScoreDraft, value: string): void {
    const match = this.matches().find((currentMatch) => currentMatch.id === matchId);

    if (match) {
      this.activeProgressLabel.set(match.predictionRound);
    }

    this.drafts.update((drafts) => updateScoreDraft(drafts, matchId, side, value));
    this.queueSave(matchId);
  }

  protected timeRemaining(deadlineAt: string): string {
    const remainingMs = Date.parse(deadlineAt) - this.now();

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

  protected hasTimeRemaining(deadlineAt: string): boolean {
    return Date.parse(deadlineAt) > this.now();
  }

  protected predictionState(match: MatchWithPrediction): PredictionPointsState | null {
    if (!match.prediction) {
      return null;
    }

    return calculatePredictionPoints(match.prediction, match.finalScore).state;
  }

  protected predictionStateColor(match: MatchWithPrediction): string | null {
    return getPredictionPointsStateColor(this.predictionState(match));
  }

  protected selectedPredictionStateColor(match: MatchWithPrediction, outcome: '1' | 'X' | '2'): string | null {
    if (match.prediction?.odds?.outcome !== outcome) {
      return null;
    }

    return this.predictionStateColor(match);
  }

  private loadMatches(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const request = this.matchesService.ensureMatches();

    if (!request) {
      this.setDraftsFromMatches();
      this.loading.set(false);
      return;
    }

    request.subscribe({
      next: ({ matches }) => {
        this.setDraftsFromMatches(matches);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Matches could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private setDraftsFromMatches(matches = this.matches()): void {
    this.drafts.set(
      Object.fromEntries(
        matches.map((match) => [
          match.id,
          {
            home: match.prediction?.home ?? null,
            away: match.prediction?.away ?? null
          }
        ])
      )
    );
  }

  private setSaving(matchId: number, saving: boolean): void {
    this.savingIds.update((savingIds) => {
      const nextSavingIds = new Set(savingIds);

      if (saving) {
        nextSavingIds.add(matchId);
      } else {
        nextSavingIds.delete(matchId);
      }

      return nextSavingIds;
    });
  }

  private queueSave(matchId: number): void {
    const match = this.matches().find((currentMatch) => currentMatch.id === matchId);
    const draft = this.drafts()[matchId];

    if (!match || match.predictionLocked || !isValidScore(draft?.home) || !isValidScore(draft?.away)) {
      return;
    }

    if (match.prediction?.home === draft.home && match.prediction.away === draft.away) {
      return;
    }

    const homeScore = draft.home;
    const awayScore = draft.away;
    const existingTimer = this.saveTimers.get(matchId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.saveTimers.set(
      matchId,
      setTimeout(() => {
        this.saveTimers.delete(matchId);
        this.savePrediction(match, homeScore, awayScore);
      }, 500)
    );
  }

  private savePrediction(match: MatchWithPrediction, homeScore: number, awayScore: number): void {
    this.setSaving(match.id, true);
    this.errorMessage.set(null);

    this.matchesService.savePrediction(match.id, { homeScore, awayScore }).subscribe({
      next: ({ prediction }) => {
        this.lastSavedMessage.set(
          `Saved ${match.homeTeam.name} ${homeScore}:${awayScore} ${match.awayTeam.name}.`
        );
        this.setSaving(match.id, false);
      },
      error: () => {
        this.errorMessage.set('Prediction could not be saved.');
        this.setSaving(match.id, false);
      }
    });
  }
}

function groupMatches(matches: readonly MatchWithPrediction[], sortMode: MatchSortMode): MatchGroup[] {
  return sortMode === 'groups' ? groupMatchesByGroups(matches) : groupMatchesByRounds(matches);
}

function isPredictionOpen(match: MatchWithPrediction, now: number): boolean {
  return !match.predictionLocked && Date.parse(match.predictionDeadlineAt) > now;
}

function isPredictionGroupClosed(group: MatchGroup, now: number): boolean {
  return group.locked === true || (group.deadlineAt !== null && Date.parse(group.deadlineAt) <= now);
}

function groupMatchesByRounds(matches: readonly MatchWithPrediction[]): MatchGroup[] {
  const groups = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    const label = match.predictionRound;
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }

  return Array.from(groups, ([label, groupedMatches]) => ({
    label,
    deadlineAt: groupedMatches[0].predictionDeadlineAt,
    locked: groupedMatches[0].predictionLocked,
    savedCount: groupedMatches.filter((match) => match.prediction !== null).length,
    totalCount: groupedMatches.length,
    sections: groupRoundSections(groupedMatches)
  }));
}

function groupRoundSections(matches: readonly MatchWithPrediction[]): MatchSection[] {
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

function groupMatchesByGroups(matches: readonly MatchWithPrediction[]): MatchGroup[] {
  const groups = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    const label = match.groupName ? `Group ${match.groupName}` : match.roundLabel;
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }

  return Array.from(groups, ([label, groupedMatches]) => ({
    label,
    deadlineAt: null,
    locked: null,
    savedCount: groupedMatches.filter((match) => match.prediction !== null).length,
    totalCount: groupedMatches.length,
    sections: groupPredictionRoundSections(groupedMatches)
  }));
}

function groupPredictionRoundSections(matches: readonly MatchWithPrediction[]): MatchSection[] {
  const sections = new Map<string, MatchWithPrediction[]>();

  for (const match of matches) {
    sections.set(match.predictionRound, [...(sections.get(match.predictionRound) ?? []), match]);
  }

  return Array.from(sections, ([label, sectionMatches]) => ({
    label,
    matches: sectionMatches
  }));
}
