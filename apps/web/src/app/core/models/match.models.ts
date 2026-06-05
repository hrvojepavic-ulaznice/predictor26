export interface MatchTeam {
  readonly name: string;
  readonly flag: string | null;
}

export interface MatchScore {
  readonly home: number;
  readonly away: number;
}

export interface Match {
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
  readonly homeTeam: MatchTeam;
  readonly awayTeam: MatchTeam;
  readonly venue: string;
  readonly city: string;
  readonly finalScore: MatchScore | null;
}

export interface MatchWithPrediction extends Match {
  readonly prediction: MatchScore | null;
}

export interface MatchesResponse {
  readonly matches: MatchWithPrediction[];
}

export interface AdminMatchesResponse {
  readonly matches: Match[];
}

export interface ImportMatchesResponse {
  readonly imported: number;
  readonly matches: Match[];
}

export interface SavePredictionRequest {
  readonly homeScore: number;
  readonly awayScore: number;
}

export interface SavePredictionResponse {
  readonly prediction: MatchScore;
}

export interface UpdateFinalScoreRequest {
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

export interface UpdateFinalScoreResponse {
  readonly match: Match;
  readonly finalScore: MatchScore | null;
}
