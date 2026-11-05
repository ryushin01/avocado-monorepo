import { count, eq, sum } from "drizzle-orm";

import type { Database } from "@/db";
import { newId } from "@/db/ids";
import { toGame } from "@/db/mappers";
import { cafes, games, inventoryItems } from "@/db/schema";
import { slice, type ListRange, type ListResult } from "@/lib/list";

import type { GameInput } from "./schema";
import type { BoardGame, CatalogEntry, GameHolding, GameListFilter } from "./types";

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface GameRepository {
  /** 카탈로그 목록. 각 게임의 매장 보유 현황을 함께 돌려준다. */
  list(filter?: GameListFilter, range?: ListRange): Promise<ListResult<CatalogEntry>>;
  get(id: string): Promise<BoardGame | null>;
  create(input: GameInput): Promise<BoardGame>;
  /** 없는 id면 null */
  update(id: string, input: GameInput): Promise<BoardGame | null>;
}

/** 이름(한글·영문 부분 일치)과 카테고리로 거르는 공통 조건 */
export function matchesGame(game: BoardGame, filter: GameListFilter = {}) {
  const q = filter.q?.toLowerCase();
  return (
    (!q ||
      game.name.toLowerCase().includes(q) ||
      Boolean(game.englishName?.toLowerCase().includes(q))) &&
    (!filter.category || game.categories.includes(filter.category))
  );
}

export const byGameName = (a: BoardGame, b: BoardGame) => a.name.localeCompare(b.name, "ko");

export function createGameRepository(db: Database): GameRepository {
  /** 게임별 보유 매장 수·총 수량. 폐점한 매장의 재고는 넣지 않는다. */
  async function holdings() {
    const rows = await db
      .select({
        gameId: inventoryItems.gameId,
        cafeCount: count(),
        quantity: sum(inventoryItems.quantity).mapWith(Number),
      })
      .from(inventoryItems)
      .innerJoin(cafes, eq(cafes.id, inventoryItems.cafeId))
      .where(eq(cafes.status, "open"))
      .groupBy(inventoryItems.gameId);
    return new Map<string, GameHolding>(
      rows.map((r) => [r.gameId, { cafeCount: r.cafeCount, quantity: r.quantity }]),
    );
  }

  return {
    async list(filter, range) {
      // 카탈로그는 수백 종 규모라 모두 읽어 이름순(한국어 정렬)으로 거른다.
      const [rows, map] = await Promise.all([db.select().from(games), holdings()]);
      const entries = rows
        .map(toGame)
        .filter((g) => matchesGame(g, filter))
        .sort(byGameName)
        .map((g) => ({ ...g, holding: map.get(g.id) ?? { cafeCount: 0, quantity: 0 } }));
      return slice(entries, range);
    },

    async get(id) {
      const [row] = await db.select().from(games).where(eq(games.id, id));
      return row ? toGame(row) : null;
    },

    async create(input) {
      const [row] = await db
        .insert(games)
        .values({
          ...input,
          id: newId("g"),
          englishName: input.englishName ?? null,
          imageUrl: input.imageUrl ?? null,
          createdAt: new Date(),
        })
        .returning();
      return toGame(row);
    },

    async update(id, input) {
      const [current] = await db.select().from(games).where(eq(games.id, id));
      if (!current) return null;
      const [row] = await db
        .update(games)
        .set({
          ...input,
          // 폼에서 비운 선택 항목(영문명·이미지)은 지운다.
          englishName: input.englishName ?? null,
          imageUrl: input.imageUrl ?? null,
          // 원본 이미지를 바꾸면 예전 원본으로 만든 썸네일은 더 이상 맞지 않는다.
          thumbnailUrl: (input.imageUrl ?? null) === current.imageUrl ? current.thumbnailUrl : null,
        })
        .where(eq(games.id, id))
        .returning();
      return toGame(row);
    },
  };
}
