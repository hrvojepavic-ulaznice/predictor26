import { Request, Response } from 'express';

import { getLeaderboard } from './leaderboard.service.js';

export async function getLeaderboardController(_req: Request, res: Response): Promise<void> {
  res.json(await getLeaderboard());
}
