import "server-only";

import { connection } from "next/server";

import { getDb } from "@/db/server";

import { createCafeRepository } from "./repository";
import { createCafeTableRepository } from "./tables";
import type { CafeInput, CafeStatus, CafeTableInput } from "@/entities/cafe";

const repository = async () => createCafeRepository(await getDb());
const tables = async () => createCafeTableRepository(await getDb());

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

export async function updateCafe(id: string, input: CafeInput, version: number) {
  return (await repository()).update(id, input, version);
}

export async function setCafeStatus(id: string, status: CafeStatus) {
  return (await repository()).setStatus(id, status);
}

// 테이블
export async function listCafeTables(cafeId: string) {
  await connection();
  return (await tables()).list(cafeId);
}

export async function addCafeTable(cafeId: string, input: CafeTableInput) {
  return (await tables()).add(cafeId, input, new Date());
}

export async function setCafeTableActive(cafeId: string, id: string, active: boolean) {
  return (await tables()).setActive(cafeId, id, active);
}
