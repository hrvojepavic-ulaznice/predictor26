import {
  getLatestLiveScoreJobRun,
  insertLiveScoreJobRun,
  insertLiveScoreSnapshot,
  insertLiveScoreUpdate,
  LatestLiveScoreSnapshotRow,
  listLatestLiveScoreSnapshots,
  listRecentLiveScoreJobRuns,
  listRecentLiveScoreUpdates,
  LiveScoreJobRunInput,
  LiveScoreSnapshotInput,
  LiveScoreUpdateInput
} from '../../database/queries/live-scores.queries.js';
import { listMatches, updateFinalScoreIfChanged } from '../../database/queries/matches.queries.js';

export function findLiveScoreMatchesForCompetition(competitionId: number) {
  return listMatches(competitionId);
}

export function setLiveScoreSnapshot(input: LiveScoreSnapshotInput): void {
  insertLiveScoreSnapshot(input);
}

export function addLiveScoreJobRun(input: LiveScoreJobRunInput): number {
  return insertLiveScoreJobRun(input);
}

export function addLiveScoreUpdate(input: LiveScoreUpdateInput): void {
  insertLiveScoreUpdate(input);
}

export function applyLiveScoreToFinalScore(
  competitionId: number,
  matchId: number,
  homeScore: number,
  awayScore: number
): boolean {
  return updateFinalScoreIfChanged(competitionId, matchId, homeScore, awayScore);
}

export function findLastLiveScoreJobRunForCompetition(competitionId: number) {
  return getLatestLiveScoreJobRun(competitionId);
}

export function findRecentLiveScoreJobRunsForCompetition(competitionId: number, limit: number) {
  return listRecentLiveScoreJobRuns(competitionId, limit);
}

export function findRecentLiveScoreUpdatesForCompetition(competitionId: number, limit: number) {
  return listRecentLiveScoreUpdates(competitionId, limit);
}

export function findLatestLiveScoreSnapshotsForCompetition(competitionId: number): LatestLiveScoreSnapshotRow[] {
  return listLatestLiveScoreSnapshots(competitionId);
}
