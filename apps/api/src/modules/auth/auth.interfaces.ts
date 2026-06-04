export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

export interface AuthUserResponse {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly role: 'super_admin' | 'admin' | 'user';
}

export interface LoginResponse {
  readonly token: string;
  readonly user: AuthUserResponse;
}
