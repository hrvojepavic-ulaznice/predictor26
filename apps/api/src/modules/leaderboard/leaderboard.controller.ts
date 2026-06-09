import { Request, Response } from 'express';

import { getUserById } from '../../database/queries/users.queries.js';
import { verifyAuthToken } from '../../shared/utils/auth-token.js';
import { getLeaderboard } from './leaderboard.service.js';

export async function getLeaderboardController(req: Request, res: Response): Promise<void> {
  res.json(await getLeaderboard(await getViewerUserId(req)));
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
