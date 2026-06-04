import { createAuthToken } from '../../shared/utils/auth-token.js';
import { verifyPassword } from '../../shared/utils/password.js';
import { LoginRequest, LoginResponse } from './auth.interfaces.js';
import { findUserByUsername } from './auth.repository.js';

const usernameMinLength = 3;
const usernameMaxLength = 40;
const passwordMinLength = 8;
const passwordMaxLength = 128;

export async function login(credentials: Partial<LoginRequest> | undefined): Promise<LoginResponse | null> {
  if (typeof credentials?.username !== 'string' || typeof credentials.password !== 'string') {
    return null;
  }

  const username = credentials.username.trim();
  const password = credentials.password;

  if (
    username.length < usernameMinLength ||
    username.length > usernameMaxLength ||
    password.length < passwordMinLength ||
    password.length > passwordMaxLength
  ) {
    return null;
  }

  const user = await findUserByUsername(username);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const responseUser = {
    id: user.id,
    username: user.username,
    name: user.first_name,
    lastname: user.last_name,
    role: user.role
  };

  return {
    token: createAuthToken({
      userId: user.id,
      username: user.username,
      role: user.role
    }),
    user: responseUser
  };
}
