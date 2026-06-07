import { Component, computed, inject } from '@angular/core';

import { MatchSortMode, MatchSortPreferenceService } from '@core/state/match-sort-preference.service';

@Component({
  selector: 'app-match-sort-menu',
  templateUrl: './match-sort-menu.component.html',
  styleUrl: './match-sort-menu.component.scss'
})
export class MatchSortMenuComponent {
  private readonly sortPreference = inject(MatchSortPreferenceService);

  protected readonly sortMode = this.sortPreference.sortMode;
  protected readonly currentLabel = computed(() => sortLabel(this.sortMode()));
  protected readonly alternateMode = computed<MatchSortMode>(() => (this.sortMode() === 'rounds' ? 'groups' : 'rounds'));
  protected readonly alternateLabel = computed(() => sortLabel(this.alternateMode()));

  protected selectMode(mode: MatchSortMode, event: MouseEvent): void {
    this.sortPreference.setSortMode(mode);
    (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
  }
}

function sortLabel(mode: MatchSortMode): string {
  return mode === 'rounds' ? 'Rounds' : 'Groups';
}
