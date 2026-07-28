import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { AuthApiProvider } from '@services/providers/auth-api.provider';
import { CompetitionsApiProvider } from '@services/providers/competitions-api.provider';

export const adminGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const authApi = inject(AuthApiProvider);
  const competitionsApi = inject(CompetitionsApiProvider);
  const router = inject(Router);
  const role = appState.currentUser()?.role;

  if (role === 'super_admin' || role === 'admin') {
    return true;
  }

  if (!appState.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return authApi.getCurrentUser().pipe(
    switchMap((user) => {
      appState.updateCurrentUser(user);

      if (user.role === 'super_admin' || user.role === 'admin') {
        return of(true);
      }

      return competitionsApi.getAdminCompetitions().pipe(
        map(({ competitions }) => (competitions.length > 0 ? true : router.createUrlTree(['/'])))
      );
    }),
    catchError(() => {
      appState.clearSession();

      return of(router.createUrlTree(['/login']));
    })
  );
};
