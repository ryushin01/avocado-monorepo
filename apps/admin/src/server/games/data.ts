import "server-only";

import { connection } from "next/server";

import type { ListRange } from "@/shared/lib/list";
import { getDb } from "@/db/server";

import { createGameRepository } from "./repository";
import type { GameInput, GameListFilter } from "@/entities/game";

const repository = async () => createGameRepository(await getDb());

export async function listCatalog(filter?: GameListFilter, range?: ListRange) {
  // 인메모리 목 데이터가 빌드 시 정적 셸에 포함되지 않도록 요청 시점으로 미룬다.
  await connection();
  return (await repository()).list(filter, range);
}

export async function createGame(input: GameInput) {
  return (await repository()).create(input);
}

export async function updateGame(id: string, input: GameInput) {
  return (await repository()).update(id, input);
}
