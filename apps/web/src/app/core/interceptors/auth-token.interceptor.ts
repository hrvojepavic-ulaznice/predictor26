import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AppStateService } from '@core/state/app-state.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AppStateService).token();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
