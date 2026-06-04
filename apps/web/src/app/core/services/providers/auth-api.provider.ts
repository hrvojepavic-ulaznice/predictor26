import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthApiProvider {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>('/api/auth/login', credentials);
  }

  register(registration: RegisterRequest) {
    return this.http.post<RegisterResponse>('/api/auth/register', registration);
  }
}
