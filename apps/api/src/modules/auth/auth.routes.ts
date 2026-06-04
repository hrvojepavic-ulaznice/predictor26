import { Router } from 'express';

import { loginController } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/auth/login', loginController);
