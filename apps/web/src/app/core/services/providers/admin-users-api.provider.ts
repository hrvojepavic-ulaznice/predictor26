import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AdminUsersResponse, UpdateUserRoleRequest, UpdateUserRoleResponse } from '@models/admin-user.models';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersApiProvider {
  private readonly http = inject(HttpClient);

  getUsers() {
    return this.http.get<AdminUsersResponse>('/api/admin/users');
  }

  updateUserRole(userId: number, request: UpdateUserRoleRequest) {
    return this.http.patch<UpdateUserRoleResponse>(`/api/admin/users/${userId}/role`, request);
  }
}
