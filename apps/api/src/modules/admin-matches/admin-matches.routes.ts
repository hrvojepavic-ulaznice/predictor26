import { Router } from 'express';

import { requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminMatchesController,
  importMatchesController,
  syncMatchOddsController,
  updateFinalScoreController,
  updateKickoffController,
  updatePlayoffMappingController
} from './admin-matches.controller.js';

export const adminMatchesRoutes = Router();

adminMatchesRoutes.use('/admin/matches', requireRoles(['super_admin', 'admin']));
adminMatchesRoutes.get('/admin/matches', getAdminMatchesController);
adminMatchesRoutes.post('/admin/matches/import', importMatchesController);
adminMatchesRoutes.post('/admin/matches/sync-odds', syncMatchOddsController);
adminMatchesRoutes.patch('/admin/matches/:matchId/final-score', updateFinalScoreController);
adminMatchesRoutes.patch('/admin/matches/:matchId/kickoff', updateKickoffController);
adminMatchesRoutes.patch('/admin/matches/:matchId/playoff-mapping', updatePlayoffMappingController);
