import { Request, Response } from 'express';

import { getUserById, UserRole } from '../../database/queries/users.queries.js';
import { verifyAuthToken } from '../../shared/utils/auth-token.js';
import {
  getLeaderboard,
  getLeaderboardMatchDays,
  getLeaderboardMatchPredictions,
  getLeaderboardStats,
  getLeaderboardUserRoundDetails
} from './leaderboard.service.js';
import { resolveCompetitionIdForViewer } from '../competitions/competitions.service.js';

interface UserRoundParams extends Record<string, string> {
  readonly userId: string;
  readonly roundLabel: string;
}

interface MatchParams extends Record<string, string> {
  readonly matchId: string;
}

export async function getLeaderboardController(req: Request, res: Response): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  res.json(await getLeaderboard(competitionId));
}

export async function getLeaderboardMatchDaysController(req: Request, res: Response): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  res.json({ days: await getLeaderboardMatchDays(competitionId) });
}

export async function getLeaderboardStatsController(req: Request, res: Response): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  res.json(await getLeaderboardStats(competitionId));
}

export async function getLeaderboardUserRoundController(req: Request<UserRoundParams>, res: Response): Promise<void> {
  const viewerUserId = await getViewerUserId(req);

  if (viewerUserId === null) {
    res.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  const result = await getLeaderboardUserRoundDetails(competitionId, Number(req.params.userId), req.params.roundLabel, viewerUserId);

  if (!result) {
    res.status(404).json({ message: 'Round tips could not be found.' });
    return;
  }

  res.json(result);
}

export async function getLeaderboardMatchPredictionsController(req: Request<MatchParams>, res: Response): Promise<void> {
  const viewerUserId = await getViewerUserId(req);

  if (viewerUserId === null) {
    res.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  const result = await getLeaderboardMatchPredictions(competitionId, Number(req.params.matchId), viewerUserId);

  if (!result) {
    res.status(404).json({ message: 'Match tips could not be found.' });
    return;
  }

  res.json(result);
}

async function resolveRequestedCompetitionId(req: Request): Promise<number | null> {
  const viewer = await getViewer(req);

  if (viewer === null) {
    return null;
  }

  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForViewer(viewer.id, viewer.role, requestedCompetitionId);
}

async function getViewerUserId(req: Request): Promise<number | null> {
  return (await getViewer(req))?.id ?? null;
}

async function getViewer(req: Request): Promise<{ readonly id: number; readonly role: UserRole } | null> {
  const authorization = req.header('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return null;
  }

  const user = await getUserById(payload.userId);

  if (!user || user.username !== payload.username) {
    return null;
  }

  return {
    id: user.id,
    role: user.role
  };
}
