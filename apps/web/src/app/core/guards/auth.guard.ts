import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (appState.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url
    }
  });
};
