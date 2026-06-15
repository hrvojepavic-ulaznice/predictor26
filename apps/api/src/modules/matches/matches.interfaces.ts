export interface MatchResponse {
  readonly id: number;
  readonly matchNumber: number;
  readonly stage: string;
  readonly groupName: string | null;
  readonly roundLabel: string;
  readonly predictionRound: string;
  readonly predictionDeadlineAt: string;
  readonly predictionLocked: boolean;
  readonly kickoffAt: string;
  readonly sourceTimeZone: string;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
  readonly venue: string;
  readonly city: string;
  readonly odds: MatchOddsResponse | null;
  readonly finalScore: ScoreResponse | null;
}

export interface MatchWithPredictionResponse extends MatchResponse {
  readonly prediction: PredictionResponse | null;
}

export interface MatchesResponse {
  readonly matches: MatchWithPredictionResponse[];
}

export interface TeamSlotResponse {
  readonly name: string;
  readonly flag: string | null;
  readonly placeholderName: string | null;
}

export interface ScoreResponse {
  readonly home: number;
  readonly away: number;
}

export interface MatchOddsResponse {
  readonly homeWin: number;
  readonly draw: number;
  readonly awayWin: number;
  readonly syncedAt: string | null;
}

export interface PredictionResponse extends ScoreResponse {
  readonly odds: PredictionOddsResponse | null;
}

export interface PredictionOddsResponse {
  readonly outcome: '1' | 'X' | '2';
  readonly value: number;
  readonly syncedAt: string | null;
}

export interface SavePredictionRequest {
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface SavePredictionResponse {
  readonly prediction: PredictionResponse;
}
