import { compareCatalog } from "@/entities/game";
import { and, count, eq, ilike, or, sum } from "drizzle-orm";

import type { Database } from "@/db/index";
import { newId } from "@/db/ids";
import { toGame } from "@/db/mappers";
import { cafes, games, inventoryItems } from "@/db/schema";
import { nextVersion } from "@/db/version";
import { slice, type ListRange, type ListResult } from "@/shared/lib/list";

import type {
  GameInput,
  BoardGame,
  CatalogEntry,
  GameHolding,
  GameListFilter,
} from "@/entities/game";

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface GameRepository {
  /** 카탈로그 목록. 각 게임의 매장 보유 현황을 함께 돌려준다. */
  list(filter?: GameListFilter, range?: ListRange): Promise<ListResult<CatalogEntry>>;
  get(id: string): Promise<BoardGame | null>;
  create(input: GameInput): Promise<BoardGame>;
  /**
   * version: 수정 폼을 연 시점의 버전. 없는 게임이면 "not-found",
   * 그사이 다른 관리자가 고쳤으면 덮어쓰지 않고 "changed".
   */
  update(id: string, input: GameInput, version: number): Promise<BoardGame | GameSaveError>;
}

export type GameSaveError = "not-found" | "changed";

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

/**
 * matchesGame의 이름 검색을 SQL 조건으로: 한글·영문 이름 부분 일치(대소문자 무시).
 * 검색어의 %·_·\는 패턴이 아니라 글자로 찾는다. 검색어가 없으면 조건을 걸지 않는다(undefined).
 */
export function gameNameLike(q?: string) {
  if (!q) return undefined;
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return or(ilike(games.name, pattern), ilike(games.englishName, pattern));
}

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
        .map((g) => ({ ...g, holding: map.get(g.id) ?? { cafeCount: 0, quantity: 0 } }))
        .sort(compareCatalog(filter?.sort, filter?.order));
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

    async update(id, input, version) {
      const [current] = await db.select().from(games).where(eq(games.id, id));
      if (!current) return "not-found";
      if (current.version !== version) return "changed";
      const [row] = await db
        .update(games)
        .set({
          ...input,
          // 폼에서 비운 선택 항목(영문명·이미지)은 지운다.
          englishName: input.englishName ?? null,
          imageUrl: input.imageUrl ?? null,
          // 원본 이미지를 바꾸면 예전 원본으로 만든 썸네일은 더 이상 맞지 않는다.
          thumbnailUrl: (input.imageUrl ?? null) === current.imageUrl ? current.thumbnailUrl : null,
          version: nextVersion(),
        })
        .where(and(eq(games.id, id), eq(games.version, version)))
        .returning();
      return row ? toGame(row) : "changed";
    },
  };
}
