import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Match } from '@models/match.models';
import { AdminMatchesApiProvider } from '@services/providers/admin-matches-api.provider';
import { isValidScore, ScoreDraft, updateScoreDraft } from '@shared/utils/score-draft.utils';

interface MatchGroup {
  readonly label: string;
  readonly matches: Match[];
}

type MatchFilter = 'active' | 'required' | 'inactive';

@Component({
  selector: 'app-admin-matches-page',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './admin-matches-page.component.html',
  styleUrl: './admin-matches-page.component.scss'
})
export class AdminMatchesPageComponent {
  private readonly adminMatchesApi = inject(AdminMatchesApiProvider);

  protected readonly matches = signal<Match[]>([]);
  protected readonly drafts = signal<Record<number, ScoreDraft>>({});
  protected readonly loading = signal(true);
  protected readonly importing = signal(false);
  protected readonly syncingOdds = signal(false);
  protected readonly savingIds = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly importMessage = signal<string | null>(null);
  protected readonly selectedFilter = signal<MatchFilter>('active');
  protected readonly requiredActionCount = computed(() => this.matches().filter((match) => isRequiredAction(match)).length);
  protected readonly filteredMatches = computed(() => filterMatches(this.matches(), this.selectedFilter()));
  protected readonly groupedMatches = computed(() => groupMatches(this.filteredMatches()));
  protected readonly scheduleActionLabel = computed(() =>
    this.importing()
      ? this.matches().length > 0
        ? 'Syncing...'
        : 'Importing...'
      : this.matches().length > 0
        ? 'Sync World Cup schedule'
        : 'Import World Cup schedule'
  );
  protected readonly oddsActionLabel = computed(() => (this.syncingOdds() ? 'Syncing odds...' : 'Sync odds'));
  private readonly saveTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    this.loadMatches();
  }

  protected importMatches(): void {
    if (this.importing()) {
      return;
    }

    this.importing.set(true);
    this.errorMessage.set(null);
    this.importMessage.set(null);

    this.adminMatchesApi.importMatches().subscribe({
      next: ({ imported, matches }) => {
        this.setMatches(matches);
        this.importMessage.set(`${imported} matches imported.`);
        this.importing.set(false);
      },
      error: () => {
        this.importMessage.set(null);
        this.errorMessage.set('Matches could not be imported.');
        this.importing.set(false);
      }
    });
  }

  protected syncOdds(): void {
    if (this.syncingOdds()) {
      return;
    }

    this.syncingOdds.set(true);
    this.errorMessage.set(null);
    this.importMessage.set(null);

    this.adminMatchesApi.syncOdds().subscribe({
      next: ({ synced, matches }) => {
        this.setMatches(matches);
        this.importMessage.set(`${synced} match odds synced.`);
        this.syncingOdds.set(false);
      },
      error: () => {
        this.importMessage.set(null);
        this.errorMessage.set('Odds could not be synced from Game-365.');
        this.syncingOdds.set(false);
      }
    });
  }

  protected updateDraft(matchId: number, side: keyof ScoreDraft, value: string): void {
    this.drafts.update((drafts) => updateScoreDraft(drafts, matchId, side, value));
    this.queueSave(matchId);
  }

  protected setFilter(filter: MatchFilter): void {
    this.selectedFilter.set(filter);
  }

  protected isRequiredAction(match: Match): boolean {
    return isRequiredAction(match);
  }

  private queueSave(matchId: number): void {
    const match = this.matches().find((currentMatch) => currentMatch.id === matchId);
    const draft = this.drafts()[matchId];

    if (!match || !isValidScore(draft?.home) || !isValidScore(draft?.away)) {
      return;
    }

    if (match.finalScore?.home === draft.home && match.finalScore.away === draft.away) {
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
        this.saveFinalScore(match, homeScore, awayScore);
      }, 500)
    );
  }

  private saveFinalScore(match: Match, homeScore: number, awayScore: number): void {
    this.setSaving(match.id, true);
    this.errorMessage.set(null);

    this.adminMatchesApi.updateFinalScore(match.id, { homeScore, awayScore }).subscribe({
      next: ({ match: updatedMatch }) => {
        this.matches.update((matches) =>
          matches.map((currentMatch) => (currentMatch.id === updatedMatch.id ? updatedMatch : currentMatch))
        );
        this.ensureSelectedFilterHasResults();
        this.setSaving(match.id, false);
      },
      error: () => {
        this.errorMessage.set('Final score could not be saved.');
        this.setSaving(match.id, false);
      }
    });
  }

  private loadMatches(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.importMessage.set(null);

    this.adminMatchesApi.getMatches().subscribe({
      next: ({ matches }) => {
        this.setMatches(matches);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Matches could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private setMatches(matches: Match[]): void {
    this.matches.set(matches);
    this.drafts.set(
      Object.fromEntries(
        matches.map((match) => [
          match.id,
          {
            home: match.finalScore?.home ?? null,
            away: match.finalScore?.away ?? null
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

  private ensureSelectedFilterHasResults(): void {
    if (this.selectedFilter() !== 'active' && filterMatches(this.matches(), this.selectedFilter()).length === 0) {
      this.selectedFilter.set('active');
    }
  }
}

function groupMatches(matches: readonly Match[]): MatchGroup[] {
  const groups = new Map<string, Match[]>();

  for (const match of matches) {
    const label = match.groupName ? `Group ${match.groupName}` : match.roundLabel;
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }

  return Array.from(groups, ([label, groupedMatches]) => ({
    label,
    matches: groupedMatches
  }));
}

function filterMatches(matches: readonly Match[], filter: MatchFilter): Match[] {
  if (filter === 'required') {
    return matches.filter((match) => isRequiredAction(match));
  }

  if (filter === 'inactive') {
    return matches.filter((match) => isInactive(match));
  }

  return matches.filter((match) => !isInactive(match));
}

function isRequiredAction(match: Match): boolean {
  const twoHoursMs = 2 * 60 * 60 * 1_000;

  return match.finalScore === null && Date.now() - Date.parse(match.kickoffAt) >= twoHoursMs;
}

function isInactive(match: Match): boolean {
  const twoHoursMs = 2 * 60 * 60 * 1_000;

  return match.finalScore !== null && Date.now() - Date.parse(match.kickoffAt) >= twoHoursMs;
}
