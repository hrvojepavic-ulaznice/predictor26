import { Router } from 'express';

import { requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import { getCompetitionSettingsController, updateCompetitionSettingsController } from './competition-settings.controller.js';

export const competitionSettingsRoutes = Router();

competitionSettingsRoutes.get('/competition/settings', getCompetitionSettingsController);
competitionSettingsRoutes.get('/admin/competition/settings', requireRoles(['super_admin', 'admin']), getCompetitionSettingsController);
competitionSettingsRoutes.patch(
  '/admin/competition/settings',
  requireRoles(['super_admin', 'admin']),
  updateCompetitionSettingsController
);
