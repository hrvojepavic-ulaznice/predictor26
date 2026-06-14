import { Router } from 'express';

import {
  getLeaderboardController,
  getLeaderboardMatchDaysController,
  getLeaderboardMatchPredictionsController,
  getLeaderboardUserRoundController
} from './leaderboard.controller.js';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/leaderboard', getLeaderboardController);
leaderboardRoutes.get('/leaderboard/matches/days', getLeaderboardMatchDaysController);
leaderboardRoutes.get('/leaderboard/matches/:matchId/predictions', getLeaderboardMatchPredictionsController);
leaderboardRoutes.get('/leaderboard/users/:userId/rounds/:roundLabel', getLeaderboardUserRoundController);
