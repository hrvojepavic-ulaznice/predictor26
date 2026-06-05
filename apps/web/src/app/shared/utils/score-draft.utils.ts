export interface ScoreDraft {
  readonly home: number | null;
  readonly away: number | null;
}

export function updateScoreDraft(
  drafts: Record<number, ScoreDraft>,
  matchId: number,
  side: keyof ScoreDraft,
  value: string
): Record<number, ScoreDraft> {
  const parsedValue = value === '' ? null : Number(value);

  return {
    ...drafts,
    [matchId]: {
      home: drafts[matchId]?.home ?? null,
      away: drafts[matchId]?.away ?? null,
      [side]: Number.isInteger(parsedValue) ? parsedValue : null
    }
  };
}

export function isValidScore(score: number | null | undefined): score is number {
  return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 99;
}
