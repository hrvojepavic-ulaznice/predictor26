export interface AdminUser {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly tiebreakerName: string | null;
  readonly role: 'super_admin' | 'admin' | 'user';
}

export interface AdminUsersResponse {
  readonly users: AdminUser[];
}

export interface UpdateUserRoleRequest {
  readonly role: 'admin' | 'user';
  readonly secretCode: string;
}

export interface UpdateUserRoleResponse {
  readonly user: AdminUser;
}

export interface UpdateUsernameRequest {
  readonly username: string;
  readonly secretCode: string;
}

export interface UpdateUsernameResponse {
  readonly user: AdminUser;
}
