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

export interface AuthUserResponse {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly tiebreakerName: string | null;
  readonly role: 'super_admin' | 'admin' | 'user';
}

export interface LoginResponse {
  readonly token: string;
  readonly user: AuthUserResponse;
}

export type RegisterResponse = LoginResponse;
