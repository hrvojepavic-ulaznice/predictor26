import { Routes } from '@angular/router';

import { adminGuard } from '@guards/admin.guard';
import { authGuard } from '@guards/auth.guard';
import { guestGuard } from '@guards/guest.guard';
import { LoginPageComponent } from '@features/auth/login/login-page.component';
import { RegisterPageComponent } from '@features/auth/register/register-page.component';
import { RulesPageComponent } from '@features/rules/rules-page.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then((component) => component.HomePageComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: LoginPageComponent
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    component: RegisterPageComponent
  },
  {
    path: 'rules',
    component: RulesPageComponent
  },
  {
    path: 'predictions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/predictions/predictions-page.component').then((component) => component.PredictionsPageComponent)
  },
  {
    path: 'my-predictions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-predictions/my-predictions-page.component').then(
        (component) => component.MyPredictionsPageComponent
      )
  },
  {
    path: 'match-day',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home-match-carousel/home-match-carousel.component').then(
        (component) => component.HomeMatchCarouselComponent
      )
  },
  {
    path: 'stats',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/stats/stats-page.component').then((component) => component.StatsPageComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-page.component').then((component) => component.AdminPageComponent)
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/users/admin-users-page.component').then((component) => component.AdminUsersPageComponent)
  },
  {
    path: 'admin/matches',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/matches/admin-matches-page.component').then(
        (component) => component.AdminMatchesPageComponent
      )
  },
  {
    path: 'admin/playoffs',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/playoffs/admin-playoffs-page.component').then(
        (component) => component.AdminPlayoffsPageComponent
      )
  },
  {
    path: 'admin/payments',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/payments/admin-payments-page.component').then(
        (component) => component.AdminPaymentsPageComponent
      )
  },
  {
    path: 'admin/notifications',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/notifications/admin-notifications-page.component').then(
        (component) => component.AdminNotificationsPageComponent
      )
  },
  {
    path: 'admin/jobs',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/jobs/admin-jobs-page.component').then((component) => component.AdminJobsPageComponent)
  },
  {
    path: 'admin/competition',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/competition/admin-competition-page.component').then(
        (component) => component.AdminCompetitionPageComponent
      )
  }
];
