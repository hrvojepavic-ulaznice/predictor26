export interface AdminUser {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly role: 'super_admin' | 'admin' | 'user';
}

export interface AdminUsersResponse {
  readonly users: AdminUser[];
}

export interface UpdateUserRoleRequest {
  readonly role: 'admin' | 'user';
}

export interface UpdateUserRoleResponse {
  readonly user: AdminUser;
}
