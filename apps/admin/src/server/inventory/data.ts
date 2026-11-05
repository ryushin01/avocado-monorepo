import "server-only";

import { connection } from "next/server";

import type { ListRange } from "@/shared/lib/list";
import { getDb } from "@/db/server";

import { createInventoryRepository, type InventoryUpdate } from "./repository";
import type { InventoryFilter } from "@/entities/inventory";

const repository = async () => createInventoryRepository(await getDb());

export async function listInventory(
  cafeId: string,
  filter?: InventoryFilter,
  range?: ListRange,
) {
  await connection();
  return (await repository()).list(cafeId, filter, range);
}

/** 매장에 아직 없는 게임 전체 (추가 창에서 골라 검색한다) */
export async function listAddableGames(cafeId: string, q?: string) {
  return (await repository()).listAddable(cafeId, q, 1000);
}

export async function addInventory(cafeId: string, gameId: string, quantity: number) {
  return (await repository()).add(cafeId, gameId, quantity);
}

export async function getInventory(cafeId: string, gameId: string) {
  return (await repository()).get(cafeId, gameId);
}

export async function updateInventory(
  cafeId: string,
  gameId: string,
  patch: InventoryUpdate,
) {
  return (await repository()).update(cafeId, gameId, patch);
}

export async function removeInventory(cafeId: string, gameId: string) {
  return (await repository()).remove(cafeId, gameId);
}

export async function summarizeInventory(cafeIds: string[]) {
  await connection();
  return (await repository()).summarize(cafeIds);
}
