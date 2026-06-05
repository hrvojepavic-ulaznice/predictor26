import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import { getMatchesController, savePredictionController } from './matches.controller.js';

export const matchesRoutes = Router();

matchesRoutes.get('/matches', requireAuth, getMatchesController);
matchesRoutes.put('/matches/:matchId/prediction', requireAuth, savePredictionController);
