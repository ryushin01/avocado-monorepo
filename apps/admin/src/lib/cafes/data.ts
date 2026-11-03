import "server-only";

import { connection } from "next/server";

import { getMockDb } from "@/lib/mock-db/server";

import { createCafeRepository } from "./repository";
import type { CafeInput } from "./schema";
import type { CafeStatus } from "./types";

const repository = () => createCafeRepository(getMockDb());

/** 모든 매장 (폐점 포함). 화면에 보여줄 매장은 permissions의 visibleCafes로 거른다. */
export async function listCafes() {
  await connection();
  return repository().list();
}

export async function listCafeOverview() {
  await connection();
  return repository().overview();
}

export function createCafe(input: CafeInput) {
  return repository().create(input);
}

export function updateCafe(id: string, input: CafeInput) {
  return repository().update(id, input);
}

export function setCafeStatus(id: string, status: CafeStatus) {
  return repository().setStatus(id, status);
}
