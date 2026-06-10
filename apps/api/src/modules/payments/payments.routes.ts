import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import { getPaymentInfoController } from './payments.controller.js';

export const paymentsRoutes = Router();

paymentsRoutes.get('/payments/info', requireAuth, getPaymentInfoController);
