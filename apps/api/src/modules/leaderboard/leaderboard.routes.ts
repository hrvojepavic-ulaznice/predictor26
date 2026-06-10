import { Router } from 'express';

import { getLeaderboardController, getLeaderboardUserRoundController } from './leaderboard.controller.js';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/leaderboard', getLeaderboardController);
leaderboardRoutes.get('/leaderboard/users/:userId/rounds/:roundLabel', getLeaderboardUserRoundController);
