import { getUserByUsername } from '../../database/queries/users.queries.js';

export async function findUserByUsername(username: string) {
  return getUserByUsername(username);
}
