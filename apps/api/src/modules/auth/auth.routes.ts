import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import { currentUserController, loginController, registerController } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.get('/auth/me', requireAuth, currentUserController);
authRoutes.post('/auth/login', loginController);
authRoutes.post('/auth/register', registerController);
