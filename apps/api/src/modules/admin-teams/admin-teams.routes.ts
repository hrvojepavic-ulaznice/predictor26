import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminTeamsController,
  updateAdminTeamDisplayNameController,
  updateAdminTeamLogoController
} from './admin-teams.controller.js';

export const adminTeamsRoutes = Router();

adminTeamsRoutes.use('/admin/teams', requireAuth);
adminTeamsRoutes.get('/admin/teams', getAdminTeamsController);
adminTeamsRoutes.patch('/admin/teams/:normalizedName/display-name', updateAdminTeamDisplayNameController);
adminTeamsRoutes.patch('/admin/teams/:normalizedName/logo', updateAdminTeamLogoController);
