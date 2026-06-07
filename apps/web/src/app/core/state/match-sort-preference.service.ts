import { Injectable, signal } from '@angular/core';

export type MatchSortMode = 'rounds' | 'groups';

const storageKey = 'predictor26.matchSortMode';

@Injectable({
  providedIn: 'root'
})
export class MatchSortPreferenceService {
  private readonly mode = signal<MatchSortMode>(readStoredMode());
  readonly sortMode = this.mode.asReadonly();

  setSortMode(mode: MatchSortMode): void {
    this.mode.set(mode);
    localStorage.setItem(storageKey, mode);
  }
}

function readStoredMode(): MatchSortMode {
  const storedMode = localStorage.getItem(storageKey);

  return storedMode === 'groups' ? 'groups' : 'rounds';
}
