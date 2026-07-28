import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminPaymentSettingsController,
  updateAdminPaymentSettingsController
} from './admin-payments.controller.js';

export const adminPaymentsRoutes = Router();

adminPaymentsRoutes.use('/admin/payments', requireAuth);
adminPaymentsRoutes.get('/admin/payments', getAdminPaymentSettingsController);
adminPaymentsRoutes.put('/admin/payments', updateAdminPaymentSettingsController);
