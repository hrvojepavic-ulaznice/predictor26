import { createUser, CreateUserInput, getUserByUsername } from '../../database/queries/users.queries.js';

export async function findUserByUsername(username: string) {
  return getUserByUsername(username);
}

export async function insertUser(input: CreateUserInput) {
  return createUser(input);
}
