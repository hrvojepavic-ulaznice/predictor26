import { config } from '../../config/index.js';
import { MatchRow } from '../../database/queries/matches.queries.js';
import { getAppMetadataValue, setAppMetadataValue } from '../../database/queries/app-metadata.queries.js';
import { fetchOddsPortalLiveScores, ProviderLiveScore } from './oddsportal-live-score-provider.js';
import {
  addLiveScoreJobRun,
  addLiveScoreUpdate,
  applyLiveScoreToFinalScore,
  findLastLiveScoreJobRun,
  findLatestLiveScoreSnapshots,
  findLiveScoreMatches,
  findRecentLiveScoreJobRuns,
  findRecentLiveScoreUpdates,
  setLiveScoreSnapshot
} from './live-scores.repository.js';

const provider = 'oddsportal';
const enabledMetadataKey = 'live_score_sync_enabled';
const recentRunLimit = 10;
const recentUpdateLimit = 20;
const schedulerMinimumDelayMs = 5_000;
const liveScoreFetchAttempts = 4;
const liveScoreFetchTimeoutMs = 30_000;
const liveScoreFetchRetryDelayMs = 2_000;

let schedulerTimer: NodeJS.Timeout | null = null;
let syncRunning = false;
let scheduledNextRunAt: string | null = null;

export interface LiveScoreRunReport {
  readonly runId: number | null;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly enabled: boolean;
  readonly status: 'success' | 'skipped' | 'failed';
  readonly checkedMatches: number;
  readonly updatedMatches: number;
  readonly liveMatches: number;
  readonly finishedMatches: number;
  readonly nextRunAt: string | null;
  readonly errorMessage: string | null;
}

export async function getLiveScoreJobSnapshot() {
  const enabled = await areLiveScoresEnabled();
  const matches = findLiveScoreMatches();
  const now = new Date();
  const activeMatches = getActiveMatches(matches, now);
  const nextRunAt = enabled ? calculateNextRunAt(matches, now, activeMatches.length > 0) : null;
  const latestSnapshotsByMatchId = new Map(findLatestLiveScoreSnapshots().map((snapshot) => [snapshot.match_id, snapshot]));

  scheduledNextRunAt = scheduledNextRunAt ?? nextRunAt;

  return {
    enabled,
    intervalMs: config.liveScorePollIntervalMs,
    status: getSchedulerStatus(enabled, activeMatches.length),
    nextRunAt: scheduledNextRunAt,
    activeMatches: activeMatches.map((match) => {
      const snapshot = latestSnapshotsByMatchId.get(match.id);

      return {
        matchId: match.id,
        matchNumber: match.match_number,
        homeTeamName: match.home_team_name,
        awayTeamName: match.away_team_name,
        kickoffAt: match.kickoff_at,
        currentScore:
          snapshot?.home_score === null || snapshot?.away_score === null || !snapshot
            ? null
            : {
                home: snapshot.home_score,
                away: snapshot.away_score
              },
        providerStatus: snapshot?.status ?? null,
        syncedAt: snapshot ? toUtcIsoString(snapshot.fetched_at) : null
      };
    }),
    lastRun: toRunReport(findLastLiveScoreJobRun()),
    recentRuns: findRecentLiveScoreJobRuns(recentRunLimit).map(toRunReportFromRow),
    recentUpdates: findRecentLiveScoreUpdates(recentUpdateLimit).map((update) => ({
      runId: update.run_id,
      matchId: update.match_id,
      matchNumber: update.match_number,
      homeTeamName: update.home_team_name,
      awayTeamName: update.away_team_name,
      previousScore:
        update.previous_home_score === null || update.previous_away_score === null
          ? null
          : {
              home: update.previous_home_score,
              away: update.previous_away_score
            },
      newScore: {
        home: update.new_home_score,
        away: update.new_away_score
      },
      providerStatus: update.provider_status,
      appliedToFinalScore: update.applied_to_final_score === 1,
      createdAt: toUtcIsoString(update.created_at)
    }))
  };
}

export function startLiveScoreScheduler(): void {
  scheduleNextLiveScoreSync(0);
}

export async function runLiveScoreSyncNow(): Promise<LiveScoreRunReport> {
  return runLiveScoreSync({ force: true });
}

export function setLiveScoreSyncEnabled(enabled: boolean): void {
  setAppMetadataValue(enabledMetadataKey, enabled ? 'true' : 'false');

  if (enabled) {
    scheduleNextLiveScoreSync(0);
    return;
  }

  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }

  scheduledNextRunAt = null;
}

async function runLiveScoreSync(options: { readonly force: boolean }): Promise<LiveScoreRunReport> {
  if (syncRunning) {
    const now = new Date();
    const report = {
      runId: null,
      startedAt: now.toISOString(),
      finishedAt: now.toISOString(),
      enabled: await areLiveScoresEnabled(),
      status: 'skipped' as const,
      checkedMatches: 0,
      updatedMatches: 0,
      liveMatches: 0,
      finishedMatches: 0,
      nextRunAt: scheduledNextRunAt,
      errorMessage: 'Live score sync is already running.'
    };
    const runId = addLiveScoreJobRun(toRunInput(report));

    return {
      ...report,
      runId
    };
  }

  syncRunning = true;
  const startedAt = new Date();
  const enabled = await areLiveScoresEnabled();
  let checkedMatches = 0;
  let updatedMatches = 0;
  let liveMatches = 0;
  let finishedMatches = 0;
  let status: LiveScoreRunReport['status'] = 'success';
  let errorMessage: string | null = null;
  const pendingUpdates: Array<{
    readonly matchId: number;
    readonly previousHomeScore: number | null;
    readonly previousAwayScore: number | null;
    readonly newHomeScore: number;
    readonly newAwayScore: number;
    readonly providerStatus: ProviderLiveScore['status'];
  }> = [];

  try {
    const matches = findLiveScoreMatches();
    const activeMatches = getActiveMatches(matches, startedAt);

    if (!enabled || (!options.force && activeMatches.length === 0)) {
      status = 'skipped';
    } else {
      const providerScores = await fetchLiveScoresWithRetry();
      const matchesByProviderScore = mapProviderScoresToMatches(activeMatches, providerScores);
      const fetchedAt = new Date().toISOString();

      checkedMatches = matchesByProviderScore.length;

      for (const { match, providerScore } of matchesByProviderScore) {
        setLiveScoreSnapshot({
          matchId: match.id,
          provider,
          providerEventId: providerScore.providerEventId,
          status: providerScore.status,
          rawStatus: providerScore.rawStatus,
          homeScore: providerScore.homeScore,
          awayScore: providerScore.awayScore,
          rawPayloadJson: JSON.stringify(providerScore.rawPayload),
          fetchedAt
        });

        if (providerScore.status === 'live') {
          liveMatches += 1;
        }

        if (providerScore.status === 'finished') {
          finishedMatches += 1;
        }

        if (providerScore.homeScore === null || providerScore.awayScore === null) {
          continue;
        }

        const applied = applyLiveScoreToFinalScore(match.id, providerScore.homeScore, providerScore.awayScore);

        if (!applied) {
          continue;
        }

        updatedMatches += 1;
        pendingUpdates.push({
          matchId: match.id,
          previousHomeScore: match.final_home_score,
          previousAwayScore: match.final_away_score,
          newHomeScore: providerScore.homeScore,
          newAwayScore: providerScore.awayScore,
          providerStatus: providerScore.status
        });
      }
    }
  } catch (error) {
    status = 'failed';
    errorMessage = error instanceof Error ? error.message : 'Live score sync failed.';
  } finally {
    syncRunning = false;
  }

  const finishedAt = new Date();
  const matches = findLiveScoreMatches();
  const nextRunAt = enabled ? calculateNextRunAt(matches, finishedAt, liveMatches > 0) : null;
  scheduledNextRunAt = nextRunAt;
  const report: LiveScoreRunReport = {
    runId: null,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    enabled,
    status,
    checkedMatches,
    updatedMatches,
    liveMatches,
    finishedMatches,
    nextRunAt,
    errorMessage
  };
  const runId = addLiveScoreJobRun(toRunInput(report));

  for (const update of pendingUpdates) {
    addLiveScoreUpdate({
      ...update,
      runId,
      appliedToFinalScore: true,
      createdAt: report.finishedAt
    });
  }

  return {
    ...report,
    runId
  };
}

function scheduleNextLiveScoreSync(delayMs: number): void {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
  }

  schedulerTimer = setTimeout(() => {
    void runLiveScoreSync({ force: false }).then((report) => {
      const nextRunAt = report.nextRunAt ? Date.parse(report.nextRunAt) : Date.now() + config.liveScorePollIntervalMs;
      scheduleNextLiveScoreSync(Math.max(nextRunAt - Date.now(), schedulerMinimumDelayMs));
    });
  }, Math.max(delayMs, schedulerMinimumDelayMs));
}

function getActiveMatches(matches: readonly MatchRow[], now: Date): MatchRow[] {
  const nowTime = now.getTime();

  return matches.filter((match) => {
    const kickoffTime = Date.parse(match.kickoff_at);

    return kickoffTime <= nowTime + config.liveScoreKickoffBufferMs && kickoffTime + config.liveScoreActiveWindowMs >= nowTime;
  });
}

function calculateNextRunAt(matches: readonly MatchRow[], now: Date, hasLiveMatches: boolean): string | null {
  if (hasLiveMatches) {
    return new Date(now.getTime() + config.liveScorePollIntervalMs).toISOString();
  }

  const nextKickoff = matches
    .map((match) => Date.parse(match.kickoff_at))
    .filter((kickoffTime) => Number.isFinite(kickoffTime) && kickoffTime + config.liveScoreActiveWindowMs >= now.getTime())
    .sort((first, second) => first - second)[0];

  if (!nextKickoff) {
    return null;
  }

  const bufferedKickoffTime = nextKickoff + config.liveScoreKickoffBufferMs;
  const nextRunTime =
    bufferedKickoffTime > now.getTime()
      ? bufferedKickoffTime
      : now.getTime() + config.liveScorePollIntervalMs;

  return new Date(nextRunTime).toISOString();
}

function mapProviderScoresToMatches(matches: readonly MatchRow[], scores: readonly ProviderLiveScore[]) {
  const mapped: Array<{ readonly match: MatchRow; readonly providerScore: ProviderLiveScore }> = [];
  const scoresByTeamKey = new Map<string, ProviderLiveScore[]>();

  for (const score of scores) {
    const key = toTeamKey(score.homeTeamName, score.awayTeamName);
    scoresByTeamKey.set(key, [...(scoresByTeamKey.get(key) ?? []), score]);
  }

  for (const match of matches) {
    const candidates = scoresByTeamKey.get(toTeamKey(match.home_team_name, match.away_team_name)) ?? [];
    const matchKickoffTime = Date.parse(match.kickoff_at);
    const providerScore =
      candidates.find((score) => {
        if (!score.kickoffAt) {
          return true;
        }

        return Math.abs(Date.parse(score.kickoffAt) - matchKickoffTime) <= 3 * 60 * 60 * 1000;
      }) ?? null;

    if (providerScore) {
      mapped.push({ match, providerScore });
    }
  }

  return mapped;
}

async function areLiveScoresEnabled(): Promise<boolean> {
  return (await getAppMetadataValue(enabledMetadataKey)) !== 'false';
}

async function fetchLiveScoresWithRetry(): Promise<ProviderLiveScore[]> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= liveScoreFetchAttempts; attempt += 1) {
    try {
      return await withTimeout(fetchOddsPortalLiveScores(), liveScoreFetchTimeoutMs);
    } catch (error) {
      lastError = error;

      if (attempt < liveScoreFetchAttempts) {
        await delay(liveScoreFetchRetryDelayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Live score fetch failed after all retry attempts.');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Live score fetch timed out after ${timeoutMs / 1000} seconds.`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getSchedulerStatus(enabled: boolean, activeMatchCount: number): 'disabled' | 'polling_live_match' | 'waiting_for_next_match' {
  if (!enabled) {
    return 'disabled';
  }

  return activeMatchCount > 0 ? 'polling_live_match' : 'waiting_for_next_match';
}

function toRunInput(report: LiveScoreRunReport) {
  return {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    status: report.status,
    checkedMatches: report.checkedMatches,
    updatedMatches: report.updatedMatches,
    liveMatches: report.liveMatches,
    finishedMatches: report.finishedMatches,
    nextRunAt: report.nextRunAt,
    errorMessage: report.errorMessage
  };
}

function toRunReport(row: ReturnType<typeof findLastLiveScoreJobRun>): LiveScoreRunReport | null {
  return row ? toRunReportFromRow(row) : null;
}

function toRunReportFromRow(row: NonNullable<ReturnType<typeof findLastLiveScoreJobRun>>): LiveScoreRunReport {
  return {
    runId: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    enabled: true,
    status: row.status,
    checkedMatches: row.checked_matches,
    updatedMatches: row.updated_matches,
    liveMatches: row.live_matches,
    finishedMatches: row.finished_matches,
    nextRunAt: row.next_run_at,
    errorMessage: row.error_message
  };
}

function toUtcIsoString(value: string): string {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return `${value.replace(' ', 'T')}Z`;
}

function toTeamKey(homeTeamName: string, awayTeamName: string): string {
  return `${normalizeTeamName(homeTeamName)}|${normalizeTeamName(awayTeamName)}`;
}

function normalizeTeamName(teamName: string): string {
  const normalized = teamName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();

  return teamNameAliases[normalized] ?? normalized;
}

const teamNameAliases: Record<string, string> = {
  bosniaandherzegovina: 'bosniaherzegovina',
  bosniaherzegovina: 'bosniaherzegovina',
  czechrepublic: 'czechia',
  drcongo: 'drcongo',
  ivorycoast: 'ivorycoast',
  turkiye: 'turkey',
  turkey: 'turkey',
  usa: 'unitedstates',
  unitedstates: 'unitedstates'
};
