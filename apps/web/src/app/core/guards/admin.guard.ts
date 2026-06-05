import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';

export const adminGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);
  const role = appState.currentUser()?.role;

  if (role === 'super_admin' || role === 'admin') {
    return true;
  }

  return router.createUrlTree([appState.isLoggedIn() ? '/' : '/login']);
};
