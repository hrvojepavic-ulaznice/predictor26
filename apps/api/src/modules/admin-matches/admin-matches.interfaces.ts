import { MatchResponse, ScoreResponse } from '../matches/matches.interfaces.js';

export interface AdminMatchesResponse {
  readonly matches: MatchResponse[];
}

export interface AdminActionSecretRequest {
  readonly secretCode: string;
}

export type ManualMatchWeekMode = 'current' | 'next';

export interface CreateManualMatchRequest extends AdminActionSecretRequest {
  readonly weekMode: ManualMatchWeekMode;
  readonly kickoffAt: string;
  readonly city: string;
  readonly venue: string;
  readonly homeTeamName: string;
  readonly homeTeamLogoDataUrl?: string | null;
  readonly awayTeamName: string;
  readonly awayTeamLogoDataUrl?: string | null;
  readonly homeWinOdds: number;
  readonly drawOdds: number;
  readonly awayWinOdds: number;
}

export interface CreateManualMatchResponse {
  readonly match: MatchResponse;
  readonly matches: MatchResponse[];
}

export interface ImportMatchesResponse {
  readonly imported: number;
  readonly matches: MatchResponse[];
}

export interface SyncMatchOddsResponse {
  readonly synced: number;
  readonly matched: number;
  readonly skippedExisting: number;
  readonly skippedFinished: number;
  readonly skippedUnresolved: number;
  readonly unmatched: number;
  readonly backfilled: number;
  readonly matches: MatchResponse[];
}

export interface UpdateFinalScoreRequest {
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

export interface UpdateFinalScoreResponse {
  readonly match: MatchResponse;
  readonly finalScore: ScoreResponse | null;
}

export interface UpdateKickoffRequest {
  readonly kickoffAt: string;
  readonly city: string;
  readonly venue: string;
  readonly secretCode: string;
}

export interface UpdateKickoffResponse {
  readonly match: MatchResponse;
}

export type PlayoffMappingSide = 'home' | 'away';

export interface UpdatePlayoffMappingRequest {
  readonly side: PlayoffMappingSide;
  readonly teamName: string | null;
  readonly teamFlag: string | null;
}

export interface UpdatePlayoffMappingResponse {
  readonly match: MatchResponse;
}
