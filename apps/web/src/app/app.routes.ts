import { Routes } from '@angular/router';

import { guestGuard } from '@guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then((component) => component.HomePageComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login-page.component').then((component) => component.LoginPageComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register-page.component').then((component) => component.RegisterPageComponent)
  }
];
