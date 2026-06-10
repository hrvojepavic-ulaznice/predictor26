export interface AdminUserResponse {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly tiebreakerName: string | null;
  readonly role: 'super_admin' | 'admin' | 'user';
  readonly isVerified: boolean;
}

export interface AdminUsersResponse {
  readonly users: AdminUserResponse[];
}

export interface UpdateUserRoleRequest {
  readonly role: 'admin' | 'user';
  readonly secretCode: string;
}

export interface UpdateUserRoleResponse {
  readonly user: AdminUserResponse;
}

export interface UpdateUserVerificationRequest {
  readonly isVerified: boolean;
  readonly secretCode: string;
}

export interface UpdateUserVerificationResponse {
  readonly user: AdminUserResponse;
}

export interface UpdateUsernameRequest {
  readonly username: string;
  readonly secretCode: string;
}

export interface UpdateUsernameResponse {
  readonly user: AdminUserResponse;
}
