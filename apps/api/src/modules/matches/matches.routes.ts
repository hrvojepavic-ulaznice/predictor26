import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import { getMatchesController, getPredictedMatchesController, savePredictionController } from './matches.controller.js';

export const matchesRoutes = Router();

matchesRoutes.get('/matches', requireAuth, getMatchesController);
matchesRoutes.get('/matches/predicted', requireAuth, getPredictedMatchesController);
matchesRoutes.put('/matches/:matchId/prediction', requireAuth, savePredictionController);
