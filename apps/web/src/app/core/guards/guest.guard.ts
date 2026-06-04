import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';

export const guestGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (!appState.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
