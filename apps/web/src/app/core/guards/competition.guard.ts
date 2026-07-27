import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';

export const competitionGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (appState.activeCompetition()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
