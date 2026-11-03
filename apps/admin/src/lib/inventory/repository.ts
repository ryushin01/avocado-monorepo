import type { Cafe } from "@/lib/cafes/types";
import { byGameName, matchesGame } from "@/lib/games/repository";
import {
  GAME_CATEGORIES,
  type BoardGame,
  type GameCategory,
} from "@/lib/games/types";
import { slice, type ListRange, type ListResult } from "@/lib/list";
import type { MockDb } from "@/lib/mock-db";
import { countInUse } from "@/lib/plays/repository";

import type {
  InventoryEntry,
  InventoryFilter,
  InventoryItem,
  InventoryStatus,
} from "./types";

export type CafeInventoryStats = {
  cafe: Cafe;
  /** 보유 게임 종류 수 */
  gameCount: number;
  /** 보유 박스 수 (폐기 제외) */
  boxCount: number;
  maintenanceCount: number;
  retiredCount: number;
};

export type InventorySummary = {
  cafes: CafeInventoryStats[];
  totals: Omit<CafeInventoryStats, "cafe"> & { cafeCount: number };
  /** 유형별 보유 현황 (폐기 제외). 게임 하나가 여러 유형이면 각 유형에 모두 센다. */
  categories: { category: GameCategory; gameCount: number; boxCount: number }[];
  /** 인원수별로 플레이할 수 있는 게임 수 (폐기 제외, 같은 게임은 한 번) */
  players: { label: string; gameCount: number }[];
  /** 최소 플레이 시간 구간별 게임 수 (폐기 제외, 같은 게임은 한 번) */
  playTime: { label: string; gameCount: number }[];
  /** 점검 중인 게임, 최근 변경 순 */
  maintenance: (InventoryEntry & { cafe: Cafe })[];
};

/** 인원수 구간. 마지막은 "max명 이상"이다. */
export const PLAYER_BUCKETS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** 최소 플레이 시간 구간(분). 각 구간의 상한, 마지막은 상한 없음. */
export const PLAY_TIME_BUCKETS = [
  { label: "30분 이하", max: 30 },
  { label: "31–60분", max: 60 },
  { label: "61–90분", max: 90 },
  { label: "91–120분", max: 120 },
  { label: "120분 초과", max: Infinity },
] as const;

/** 게임 목록 → 인원수별·플레이 시간별 분포 */
export function distributions(games: BoardGame[]) {
  const last = PLAYER_BUCKETS[PLAYER_BUCKETS.length - 1];
  return {
    players: PLAYER_BUCKETS.map((n) => ({
      label: n === last ? `${n}명 이상` : `${n}명`,
      gameCount: games.filter((g) =>
        n === last ? g.maxPlayers >= n : g.minPlayers <= n && n <= g.maxPlayers,
      ).length,
    })),
    playTime: PLAY_TIME_BUCKETS.map(({ label, max }, i) => {
      const min = i === 0 ? 0 : PLAY_TIME_BUCKETS[i - 1].max;
      return {
        label,
        gameCount: games.filter((g) => g.playTimeMin > min && g.playTimeMin <= max)
          .length,
      };
    }),
  };
}

export type InventoryUpdate = { quantity?: number; status?: InventoryStatus };

/**
 * - not-found: 그 매장에 없는 게임
 * - in-use: 이용 중인 박스가 있어 제외할 수 없거나, 이용 중인 수보다 적게 줄이려 함
 *
 * 상태(점검 중·폐기)는 이용 중이어도 바꿀 수 있다. 새로 빌려주지 않을 뿐, 지금 쓰는 박스는 반납받는다.
 */
export type InventoryChangeError = "not-found" | "in-use";

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. */
export interface InventoryRepository {
  list(
    cafeId: string,
    filter?: InventoryFilter,
    range?: ListRange,
  ): Promise<ListResult<InventoryEntry>>;
  /** 매장에 아직 없는 카탈로그 게임 (추가 후보) */
  listAddable(cafeId: string, q?: string, limit?: number): Promise<BoardGame[]>;
  /** 이미 있거나 매장·게임이 없으면 null */
  add(cafeId: string, gameId: string, quantity: number): Promise<InventoryEntry | null>;
  get(cafeId: string, gameId: string): Promise<InventoryEntry | null>;
  update(
    cafeId: string,
    gameId: string,
    patch: InventoryUpdate,
  ): Promise<InventoryEntry | InventoryChangeError>;
  remove(cafeId: string, gameId: string): Promise<true | InventoryChangeError>;
  /** cafeIds 매장들의 요약. 대시보드에서 쓴다. */
  summarize(cafeIds: string[], maintenanceLimit?: number): Promise<InventorySummary>;
}

export function createInventoryRepository(db: MockDb): InventoryRepository {
  const gameById = () => new Map(db.games.map((g) => [g.id, g]));
  const findIndex = (cafeId: string, gameId: string) =>
    db.inventory.findIndex((i) => i.cafeId === cafeId && i.gameId === gameId);
  const inUseOf = (cafeId: string, gameId: string) =>
    db.plays.filter((p) => p.cafeId === cafeId && p.gameId === gameId && !p.returnedAt)
      .length;
  const toEntry = (
    item: InventoryItem,
    game: BoardGame,
    inUse = inUseOf(item.cafeId, item.gameId),
  ): InventoryEntry => ({
    ...item,
    game: { ...game },
    inUse,
  });

  return {
    async list(cafeId, filter = {}, range) {
      const games = gameById();
      const inUse = countInUse(db.plays, cafeId);
      const entries = db.inventory
        .filter((i) => i.cafeId === cafeId)
        .filter((i) => !filter.status || i.status === filter.status)
        .flatMap((i) => {
          const game = games.get(i.gameId);
          return game && matchesGame(game, filter)
            ? [toEntry(i, game, inUse.get(i.gameId) ?? 0)]
            : [];
        })
        .sort((a, b) => byGameName(a.game, b.game));
      return slice(entries, range);
    },

    async listAddable(cafeId, q, limit = 20) {
      const owned = new Set(
        db.inventory.filter((i) => i.cafeId === cafeId).map((i) => i.gameId),
      );
      return db.games
        .filter((g) => !owned.has(g.id) && matchesGame(g, { q }))
        .sort(byGameName)
        .slice(0, limit)
        .map((g) => ({ ...g }));
    },

    async add(cafeId, gameId, quantity) {
      const game = db.games.find((g) => g.id === gameId);
      const cafe = db.cafes.find((c) => c.id === cafeId);
      if (!game || !cafe || findIndex(cafeId, gameId) !== -1) return null;
      const item: InventoryItem = {
        cafeId,
        gameId,
        quantity,
        status: "available",
        updatedAt: new Date().toISOString(),
      };
      db.inventory.push(item);
      return toEntry(item, game, 0);
    },

    async get(cafeId, gameId) {
      const index = findIndex(cafeId, gameId);
      const game = db.games.find((g) => g.id === gameId);
      return index === -1 || !game ? null : toEntry(db.inventory[index], game);
    },

    async update(cafeId, gameId, patch) {
      const index = findIndex(cafeId, gameId);
      const game = db.games.find((g) => g.id === gameId);
      if (index === -1 || !game) return "not-found";
      if (patch.quantity !== undefined && patch.quantity < inUseOf(cafeId, gameId)) {
        return "in-use";
      }
      db.inventory[index] = {
        ...db.inventory[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return toEntry(db.inventory[index], game);
    },

    async remove(cafeId, gameId) {
      const index = findIndex(cafeId, gameId);
      if (index === -1) return "not-found";
      if (inUseOf(cafeId, gameId) > 0) return "in-use";
      db.inventory.splice(index, 1);
      return true;
    },

    async summarize(cafeIds, maintenanceLimit = 5) {
      const games = gameById();
      const scope = new Set(cafeIds);
      const cafes = db.cafes.filter((c) => scope.has(c.id));
      const items = db.inventory.filter(
        (i) => scope.has(i.cafeId) && games.has(i.gameId),
      );

      const stats = (list: InventoryItem[]) => ({
        gameCount: list.length,
        boxCount: list
          .filter((i) => i.status !== "retired")
          .reduce((sum, i) => sum + i.quantity, 0),
        maintenanceCount: list.filter((i) => i.status === "maintenance").length,
        retiredCount: list.filter((i) => i.status === "retired").length,
      });

      const categories = GAME_CATEGORIES.map((category) => {
        const inCategory = items.filter(
          (i) =>
            i.status !== "retired" &&
            games.get(i.gameId)!.categories.includes(category),
        );
        return {
          category,
          gameCount: new Set(inCategory.map((i) => i.gameId)).size,
          boxCount: inCategory.reduce((sum, i) => sum + i.quantity, 0),
        };
      });

      const cafeById = new Map(cafes.map((c) => [c.id, c]));
      const maintenance = items
        .filter((i) => i.status === "maintenance")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, maintenanceLimit)
        .map((i) => ({
          ...toEntry(i, games.get(i.gameId)!),
          cafe: { ...cafeById.get(i.cafeId)! },
        }));

      const activeGames = [
        ...new Set(
          items.filter((i) => i.status !== "retired").map((i) => i.gameId),
        ),
      ].map((id) => games.get(id)!);

      return {
        ...distributions(activeGames),
        cafes: cafes.map((cafe) => ({
          cafe: { ...cafe },
          ...stats(items.filter((i) => i.cafeId === cafe.id)),
        })),
        totals: {
          cafeCount: cafes.length,
          ...stats(items),
          // 여러 매장이 같은 게임을 가져도 종류는 하나로 센다.
          gameCount: new Set(items.map((i) => i.gameId)).size,
        },
        categories,
        maintenance,
      };
    },
  };
}
