import "server-only";

import { connection } from "next/server";

import type { ListRange } from "@/lib/list";
import { getMockDb } from "@/lib/mock-db/server";

import { createInventoryRepository, type InventoryUpdate } from "./repository";
import type { InventoryFilter } from "./types";

const repository = () => createInventoryRepository(getMockDb());

export async function listInventory(
  cafeId: string,
  filter?: InventoryFilter,
  range?: ListRange,
) {
  await connection();
  return repository().list(cafeId, filter, range);
}

/** 매장에 아직 없는 게임 전체 (추가 창에서 골라 검색한다) */
export function listAddableGames(cafeId: string, q?: string) {
  return repository().listAddable(cafeId, q, 1000);
}

export function addInventory(cafeId: string, gameId: string, quantity: number) {
  return repository().add(cafeId, gameId, quantity);
}

export function getInventory(cafeId: string, gameId: string) {
  return repository().get(cafeId, gameId);
}

export function updateInventory(
  cafeId: string,
  gameId: string,
  patch: InventoryUpdate,
) {
  return repository().update(cafeId, gameId, patch);
}

export function removeInventory(cafeId: string, gameId: string) {
  return repository().remove(cafeId, gameId);
}

export async function summarizeInventory(cafeIds: string[]) {
  await connection();
  return repository().summarize(cafeIds);
}
