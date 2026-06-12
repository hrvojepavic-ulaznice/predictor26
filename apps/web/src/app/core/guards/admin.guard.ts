import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { AuthApiProvider } from '@services/providers/auth-api.provider';

export const adminGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const authApi = inject(AuthApiProvider);
  const router = inject(Router);
  const role = appState.currentUser()?.role;

  if (role === 'super_admin' || role === 'admin') {
    return true;
  }

  if (!appState.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return authApi.getCurrentUser().pipe(
    map((user) => {
      appState.updateCurrentUser(user);

      return user.role === 'super_admin' || user.role === 'admin' ? true : router.createUrlTree(['/']);
    }),
    catchError(() => {
      appState.clearSession();

      return of(router.createUrlTree(['/login']));
    })
  );
};
