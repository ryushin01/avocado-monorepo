import "server-only";

import { connection } from "next/server";

import { getMockDb } from "@/lib/mock-db/server";

import { createUserRepository } from "./repository";
import type { UserInput } from "./schema";

const repository = () => createUserRepository(getMockDb());

export async function listUsers() {
  await connection();
  return repository().list();
}

export function createUser(input: UserInput) {
  return repository().create(input);
}

export function updateUser(id: string, input: UserInput, actorId: string) {
  return repository().update(id, input, actorId);
}

export function setUserActive(id: string, active: boolean, actorId: string) {
  return repository().setActive(id, active, actorId);
}
