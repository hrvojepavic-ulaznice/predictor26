import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import {
  getLeaderboardController,
  getLeaderboardMatchDaysController,
  getLeaderboardMatchPredictionsController,
  getLeaderboardStatsController,
  getLeaderboardUserRoundController
} from './leaderboard.controller.js';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/leaderboard', getLeaderboardController);
leaderboardRoutes.get('/leaderboard/stats', requireAuth, getLeaderboardStatsController);
leaderboardRoutes.get('/leaderboard/matches/days', getLeaderboardMatchDaysController);
leaderboardRoutes.get('/leaderboard/matches/:matchId/predictions', getLeaderboardMatchPredictionsController);
leaderboardRoutes.get('/leaderboard/users/:userId/rounds/:roundLabel', getLeaderboardUserRoundController);
