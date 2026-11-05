import "server-only";

import { connection } from "next/server";

import { getDb } from "@/db/server";

import { createCafeRepository } from "./repository";
import type { CafeInput } from "./schema";
import type { CafeStatus } from "./types";

const repository = async () => createCafeRepository(await getDb());

/** 모든 매장 (폐점 포함). 화면에 보여줄 매장은 permissions의 visibleCafes로 거른다. */
export async function listCafes() {
  await connection();
  return (await repository()).list();
}

export async function listCafeOverview() {
  await connection();
  return (await repository()).overview();
}

export async function createCafe(input: CafeInput) {
  return (await repository()).create(input);
}

export async function updateCafe(id: string, input: CafeInput) {
  return (await repository()).update(id, input);
}

export async function setCafeStatus(id: string, status: CafeStatus) {
  return (await repository()).setStatus(id, status);
}
