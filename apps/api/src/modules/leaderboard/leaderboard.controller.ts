import { Request, Response } from 'express';

import { getUserById } from '../../database/queries/users.queries.js';
import { verifyAuthToken } from '../../shared/utils/auth-token.js';
import {
  getLeaderboard,
  getLeaderboardMatchDays,
  getLeaderboardMatchPredictions,
  getLeaderboardStats,
  getLeaderboardUserRoundDetails
} from './leaderboard.service.js';

interface UserRoundParams extends Record<string, string> {
  readonly userId: string;
  readonly roundLabel: string;
}

interface MatchParams extends Record<string, string> {
  readonly matchId: string;
}

export async function getLeaderboardController(req: Request, res: Response): Promise<void> {
  res.json(await getLeaderboard());
}

export async function getLeaderboardMatchDaysController(_req: Request, res: Response): Promise<void> {
  res.json({ days: await getLeaderboardMatchDays() });
}

export async function getLeaderboardStatsController(_req: Request, res: Response): Promise<void> {
  res.json(await getLeaderboardStats());
}

export async function getLeaderboardUserRoundController(req: Request<UserRoundParams>, res: Response): Promise<void> {
  const viewerUserId = await getViewerUserId(req);

  if (viewerUserId === null) {
    res.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  const result = await getLeaderboardUserRoundDetails(Number(req.params.userId), req.params.roundLabel, viewerUserId);

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

  const result = await getLeaderboardMatchPredictions(Number(req.params.matchId), viewerUserId);

  if (!result) {
    res.status(404).json({ message: 'Match tips could not be found.' });
    return;
  }

  res.json(result);
}

async function getViewerUserId(req: Request): Promise<number | null> {
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

  return user.id;
}
