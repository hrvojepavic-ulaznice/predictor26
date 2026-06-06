import { Router } from 'express';

import { getLeaderboardController } from './leaderboard.controller.js';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/leaderboard', getLeaderboardController);
