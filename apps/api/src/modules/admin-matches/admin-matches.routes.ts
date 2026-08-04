import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import {
  createManualMatchController,
  getAdminMatchesController,
  importMatchesController,
  importMatchesWithOddsController,
  releaseMatchRoundController,
  syncMatchOddsController,
  updateFinalScoreController,
  updateKickoffController,
  updatePostponedController,
  updatePlayoffMappingController
} from './admin-matches.controller.js';

export const adminMatchesRoutes = Router();

adminMatchesRoutes.use('/admin/matches', requireAuth);
adminMatchesRoutes.get('/admin/matches', getAdminMatchesController);
adminMatchesRoutes.post('/admin/matches', createManualMatchController);
adminMatchesRoutes.post('/admin/matches/import', importMatchesController);
adminMatchesRoutes.post('/admin/matches/import-with-odds', importMatchesWithOddsController);
adminMatchesRoutes.post('/admin/matches/sync-odds', syncMatchOddsController);
adminMatchesRoutes.post('/admin/matches/release-round', releaseMatchRoundController);
adminMatchesRoutes.patch('/admin/matches/:matchId/final-score', updateFinalScoreController);
adminMatchesRoutes.patch('/admin/matches/:matchId/kickoff', updateKickoffController);
adminMatchesRoutes.patch('/admin/matches/:matchId/postponed', updatePostponedController);
adminMatchesRoutes.patch('/admin/matches/:matchId/playoff-mapping', updatePlayoffMappingController);
