import { slice, type ListRange, type ListResult } from "@/lib/list";
import type { MockDb } from "@/lib/mock-db";

import type { GameInput } from "./schema";
import type {
  BoardGame,
  CatalogEntry,
  GameHolding,
  GameListFilter,
} from "./types";

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. */
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

export const byGameName = (a: BoardGame, b: BoardGame) =>
  a.name.localeCompare(b.name, "ko");

export function createGameRepository(db: MockDb): GameRepository {
  const holdings = () => {
    const map = new Map<string, GameHolding>();
    // 폐점한 매장의 재고는 보유 현황에 넣지 않는다.
    const open = new Set(db.cafes.filter((c) => c.status === "open").map((c) => c.id));
    for (const item of db.inventory) {
      if (!open.has(item.cafeId)) continue;
      const h = map.get(item.gameId) ?? { cafeCount: 0, quantity: 0 };
      map.set(item.gameId, {
        cafeCount: h.cafeCount + 1,
        quantity: h.quantity + item.quantity,
      });
    }
    return map;
  };

  return {
    async list(filter, range) {
      const map = holdings();
      const games = db.games
        .filter((g) => matchesGame(g, filter))
        .sort(byGameName)
        .map((g) => ({
          ...g,
          holding: map.get(g.id) ?? { cafeCount: 0, quantity: 0 },
        }));
      return slice(games, range);
    },
    async get(id) {
      const game = db.games.find((g) => g.id === id);
      return game ? { ...game } : null;
    },
    async create(input) {
      const game: BoardGame = {
        ...input,
        id: `g_${db.nextGameId++}`,
        createdAt: new Date().toISOString(),
      };
      db.games.push(game);
      return { ...game };
    },
    async update(id, input) {
      const index = db.games.findIndex((g) => g.id === id);
      if (index === -1) return null;
      const current = db.games[index];
      // 폼에서 비운 선택 항목(영문명·이미지)은 지운다.
      db.games[index] = {
        ...current,
        englishName: undefined,
        imageUrl: undefined,
        ...input,
        // 원본 이미지를 바꾸면 예전 원본으로 만든 썸네일은 더 이상 맞지 않는다.
        thumbnailUrl:
          input.imageUrl === current.imageUrl ? current.thumbnailUrl : undefined,
        id,
      };
      return { ...db.games[index] };
    },
  };
}
