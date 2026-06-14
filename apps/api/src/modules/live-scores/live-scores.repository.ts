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

export function findLiveScoreMatches() {
  return listMatches();
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

export function applyLiveScoreToFinalScore(matchId: number, homeScore: number, awayScore: number): boolean {
  return updateFinalScoreIfChanged(matchId, homeScore, awayScore);
}

export function findLastLiveScoreJobRun() {
  return getLatestLiveScoreJobRun();
}

export function findRecentLiveScoreJobRuns(limit: number) {
  return listRecentLiveScoreJobRuns(limit);
}

export function findRecentLiveScoreUpdates(limit: number) {
  return listRecentLiveScoreUpdates(limit);
}

export function findLatestLiveScoreSnapshots(): LatestLiveScoreSnapshotRow[] {
  return listLatestLiveScoreSnapshots();
}
