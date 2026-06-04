import { Routes } from '@angular/router';

import { guestGuard } from '@guards/guest.guard';
import { LoginPageComponent } from '@features/auth/login/login-page.component';
import { RegisterPageComponent } from '@features/auth/register/register-page.component';

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
  }
];
