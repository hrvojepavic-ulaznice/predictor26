import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { LoginRequest, LoginResponse } from '@models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthApiProvider {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>('/api/auth/login', credentials);
  }
}
