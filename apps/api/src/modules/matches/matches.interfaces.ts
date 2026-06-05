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
  readonly finalScore: ScoreResponse | null;
}

export interface MatchWithPredictionResponse extends MatchResponse {
  readonly prediction: ScoreResponse | null;
}

export interface MatchesResponse {
  readonly matches: MatchWithPredictionResponse[];
}

export interface TeamSlotResponse {
  readonly name: string;
  readonly flag: string | null;
}

export interface ScoreResponse {
  readonly home: number;
  readonly away: number;
}

export interface SavePredictionRequest {
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface SavePredictionResponse {
  readonly prediction: ScoreResponse;
}
