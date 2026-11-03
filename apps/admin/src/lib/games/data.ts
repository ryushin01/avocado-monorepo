import "server-only";

import { connection } from "next/server";

import type { ListRange } from "@/lib/list";
import { getMockDb } from "@/lib/mock-db/server";

import { createGameRepository } from "./repository";
import type { GameInput } from "./schema";
import type { GameListFilter } from "./types";

const repository = () => createGameRepository(getMockDb());

export async function listCatalog(filter?: GameListFilter, range?: ListRange) {
  // 인메모리 목 데이터가 빌드 시 정적 셸에 포함되지 않도록 요청 시점으로 미룬다.
  await connection();
  return repository().list(filter, range);
}

export function createGame(input: GameInput) {
  return repository().create(input);
}

export function updateGame(id: string, input: GameInput) {
  return repository().update(id, input);
}
