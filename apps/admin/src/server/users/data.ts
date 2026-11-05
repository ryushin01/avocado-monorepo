import "server-only";

import { connection } from "next/server";

import { getDb } from "@/db/server";

import { createUserRepository } from "./repository";
import type { UserInput } from "@/entities/user";

const repository = async () => createUserRepository(await getDb());

export async function listUsers() {
  await connection();
  return (await repository()).list();
}

export async function createUser(input: UserInput, passwordHash: string) {
  return (await repository()).create(input, passwordHash);
}

export async function updateUser(id: string, input: UserInput, actorId: string, passwordHash?: string) {
  return (await repository()).update(id, input, actorId, passwordHash);
}

export async function setUserActive(id: string, active: boolean, actorId: string) {
  return (await repository()).setActive(id, active, actorId);
}
