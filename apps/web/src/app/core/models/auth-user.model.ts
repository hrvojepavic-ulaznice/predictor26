export interface AuthUser {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly lastname: string;
  readonly tiebreakerName: string | null;
  readonly role: 'super_admin' | 'admin' | 'user';
}
