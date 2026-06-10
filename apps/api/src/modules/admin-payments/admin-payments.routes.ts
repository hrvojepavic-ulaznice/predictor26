import { Router } from 'express';

import { requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminPaymentSettingsController,
  updateAdminPaymentSettingsController
} from './admin-payments.controller.js';

export const adminPaymentsRoutes = Router();

adminPaymentsRoutes.use('/admin/payments', requireRoles(['super_admin', 'admin']));
adminPaymentsRoutes.get('/admin/payments', getAdminPaymentSettingsController);
adminPaymentsRoutes.put('/admin/payments', updateAdminPaymentSettingsController);
