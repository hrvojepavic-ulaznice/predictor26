import { Router } from 'express';

import { getWorldCupTeamsController } from './world-cup-teams.controller.js';

export const worldCupTeamsRoutes = Router();

worldCupTeamsRoutes.get('/world-cup-teams', getWorldCupTeamsController);
