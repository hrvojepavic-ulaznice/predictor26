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
  }
];
