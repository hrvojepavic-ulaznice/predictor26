export interface KickoffSortableMatch {
  readonly kickoffAt: string;
  readonly matchNumber: number;
}

export function sortMatchesByKickoff<T extends KickoffSortableMatch>(matches: readonly T[]): T[] {
  return [...matches].sort((firstMatch, secondMatch) => {
    const kickoffComparison = Date.parse(firstMatch.kickoffAt) - Date.parse(secondMatch.kickoffAt);

    if (kickoffComparison !== 0) {
      return kickoffComparison;
    }

    return firstMatch.matchNumber - secondMatch.matchNumber;
  });
}
