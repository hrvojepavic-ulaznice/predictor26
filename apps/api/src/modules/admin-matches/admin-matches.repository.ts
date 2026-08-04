import {
  backfillMissingPredictionOdds,
  clearFinalScoresBeforeKickoff,
  deleteMatchesAfterMatchNumber,
  deletePredictionsBeforeKickoff,
  listMatches,
  insertManualMatch,
  ManualMatchInput,
  MatchOddsInput,
  MatchImportInput,
  TeamImportInput,
  applyCompetitionTeamLogosToMatches,
  upsertCompetitionTeams,
  updateFinalScore,
  updateMatchKickoff,
  updateMatchPostponed,
  updateMatchOdds,
  updatePlayoffTeamMapping,
  upsertImportedMatches,
  releaseMatchesByIds,
  releaseMatchesForRound
} from '../../database/queries/matches.queries.js';
import { getAppMetadataValue, setAppMetadataValue } from '../../database/queries/app-metadata.queries.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';

export function findAdminMatches(competitionId: number) {
  return listMatches(competitionId);
}

export async function findSuperAdminForSecretCode() {
  return getSuperAdminUser();
}

export function importMatches(matches: readonly MatchImportInput[], competitionId: number) {
  return upsertImportedMatches(matches, competitionId);
}

export function importTeams(teams: readonly TeamImportInput[], competitionId: number) {
  upsertCompetitionTeams(competitionId, teams);
}

export function addManualMatch(competitionId: number, match: ManualMatchInput) {
  return insertManualMatch(competitionId, match);
}

export function applyTeamLogosToMatches(competitionId: number) {
  applyCompetitionTeamLogosToMatches(competitionId);
}

export function pruneMatchesAfter(matchNumber: number, competitionId: number) {
  return deleteMatchesAfterMatchNumber(matchNumber, competitionId);
}

export async function getMetadataValue(key: string) {
  return getAppMetadataValue(key);
}

export function setMetadataValue(key: string, value: string) {
  setAppMetadataValue(key, value);
}

export function clearPendingFinalScores(competitionId: number, nowIso: string) {
  return clearFinalScoresBeforeKickoff(competitionId, nowIso);
}

export function clearPendingPredictions(competitionId: number, nowIso: string) {
  return deletePredictionsBeforeKickoff(competitionId, nowIso);
}

export function setFinalScore(competitionId: number, matchId: number, homeScore: number | null, awayScore: number | null) {
  return updateFinalScore(competitionId, matchId, homeScore, awayScore);
}

export function setKickoff(competitionId: number, matchId: number, kickoffAt: string, city: string, venue: string) {
  return updateMatchKickoff(competitionId, matchId, kickoffAt, city, venue);
}

export function setPostponed(competitionId: number, matchId: number, isPostponed: boolean) {
  return updateMatchPostponed(competitionId, matchId, isPostponed);
}

export function setPlayoffTeamMapping(
  competitionId: number,
  matchId: number,
  side: 'home' | 'away',
  teamName: string | null,
  teamFlag: string | null
) {
  return updatePlayoffTeamMapping(competitionId, matchId, side, teamName, teamFlag);
}

export function setMatchOdds(odds: readonly MatchOddsInput[]) {
  return updateMatchOdds(odds);
}

export function backfillPredictionOdds(competitionId: number) {
  return backfillMissingPredictionOdds(competitionId);
}

export function releaseRoundMatches(competitionId: number, roundLabel: string) {
  return releaseMatchesForRound(competitionId, roundLabel);
}

export function releaseImportedMatches(competitionId: number, matchIds: readonly number[]) {
  return releaseMatchesByIds(competitionId, matchIds);
}
