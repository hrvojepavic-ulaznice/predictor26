import { AuthUser } from './auth-user.model';

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly tiebreakerName: string;
  readonly password: string;
  readonly acceptedRules: boolean;
}

export interface LoginResponse {
  readonly token: string;
  readonly user: AuthUser;
}

export type RegisterResponse = LoginResponse;
