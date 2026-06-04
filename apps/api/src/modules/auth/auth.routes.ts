import { Router } from 'express';

import { loginController, registerController } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/auth/login', loginController);
authRoutes.post('/auth/register', registerController);
