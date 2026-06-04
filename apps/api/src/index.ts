import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { config } from './config/index.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', healthRoutes);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
