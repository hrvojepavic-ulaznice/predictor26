import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { config } from './config/index.js';
import { adminMatchesRoutes } from './modules/admin-matches/admin-matches.routes.js';
import { adminPaymentsRoutes } from './modules/admin-payments/admin-payments.routes.js';
import { adminUsersRoutes } from './modules/admin-users/admin-users.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes.js';
import { matchesRoutes } from './modules/matches/matches.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { startNotificationReminderScheduler } from './modules/notifications/notifications.service.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';
import { worldCupTeamsRoutes } from './modules/world-cup-teams/world-cup-teams.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', matchesRoutes);
app.use('/api', notificationsRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', worldCupTeamsRoutes);
app.use('/api', adminMatchesRoutes);
app.use('/api', adminPaymentsRoutes);
app.use('/api', adminUsersRoutes);
app.use('/api', healthRoutes);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

startNotificationReminderScheduler();
