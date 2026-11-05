import { and, count, eq, inArray, isNull, notInArray } from "drizzle-orm";

import type { Database } from "@/db";
import { toCafe, toGame, toInventoryItem } from "@/db/mappers";
import { cafes, games, inventoryItems, playSessions } from "@/db/schema";
import type { Cafe } from "@/lib/cafes/types";
import { byGameName, matchesGame } from "@/lib/games/repository";
import {
  GAME_CATEGORIES,
  type BoardGame,
  type GameCategory,
} from "@/lib/games/types";
import { slice, type ListRange, type ListResult } from "@/lib/list";

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

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface InventoryRepository {
  list(cafeId: string, filter?: InventoryFilter, range?: ListRange): Promise<ListResult<InventoryEntry>>;
  /** 매장에 아직 없는 카탈로그 게임 (추가 후보) */
  listAddable(cafeId: string, q?: string, limit?: number): Promise<BoardGame[]>;
  /** 이미 있거나 매장·게임이 없으면 null */
  add(cafeId: string, gameId: string, quantity: number): Promise<InventoryEntry | null>;
  get(cafeId: string, gameId: string): Promise<InventoryEntry | null>;
  update(cafeId: string, gameId: string, patch: InventoryUpdate): Promise<InventoryEntry | InventoryChangeError>;
  remove(cafeId: string, gameId: string): Promise<true | InventoryChangeError>;
  /** cafeIds 매장들의 요약. 대시보드에서 쓴다. */
  summarize(cafeIds: string[], maintenanceLimit?: number): Promise<InventorySummary>;
}

/** cafeId 매장에서 지금 이용 중(반납 전)인 박스 수, 게임별 */
export async function countInUse(db: Database, cafeId: string, gameIds?: string[]) {
  const rows = await db
    .select({ gameId: playSessions.gameId, n: count() })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.cafeId, cafeId),
        isNull(playSessions.returnedAt),
        gameIds ? inArray(playSessions.gameId, gameIds) : undefined,
      ),
    )
    .groupBy(playSessions.gameId);
  return new Map(rows.map((r) => [r.gameId, r.n]));
}

export function createInventoryRepository(db: Database): InventoryRepository {
  const key = (cafeId: string, gameId: string) =>
    and(eq(inventoryItems.cafeId, cafeId), eq(inventoryItems.gameId, gameId));

  /** 재고 한 줄 + 게임 + 이용 중 수 */
  async function entryOf(cafeId: string, gameId: string): Promise<InventoryEntry | null> {
    const [row] = await db
      .select()
      .from(inventoryItems)
      .innerJoin(games, eq(games.id, inventoryItems.gameId))
      .where(key(cafeId, gameId));
    if (!row) return null;
    const inUse = (await countInUse(db, cafeId, [gameId])).get(gameId) ?? 0;
    return { ...toInventoryItem(row.inventory_items), game: toGame(row.games), inUse };
  }

  return {
    async list(cafeId, filter = {}, range) {
      const [rows, inUse] = await Promise.all([
        db
          .select()
          .from(inventoryItems)
          .innerJoin(games, eq(games.id, inventoryItems.gameId))
          .where(
            and(
              eq(inventoryItems.cafeId, cafeId),
              filter.status ? eq(inventoryItems.status, filter.status) : undefined,
            ),
          ),
        countInUse(db, cafeId),
      ]);
      const entries = rows
        .map((r) => ({
          ...toInventoryItem(r.inventory_items),
          game: toGame(r.games),
          inUse: inUse.get(r.inventory_items.gameId) ?? 0,
        }))
        .filter((e) => matchesGame(e.game, filter))
        .sort((a, b) => byGameName(a.game, b.game));
      return slice(entries, range);
    },

    async listAddable(cafeId, q, limit = 20) {
      const owned = db
        .select({ gameId: inventoryItems.gameId })
        .from(inventoryItems)
        .where(eq(inventoryItems.cafeId, cafeId));
      const rows = await db.select().from(games).where(notInArray(games.id, owned));
      return rows
        .map(toGame)
        .filter((g) => matchesGame(g, { q }))
        .sort(byGameName)
        .slice(0, limit);
    },

    async add(cafeId, gameId, quantity) {
      const [[game], [cafe]] = await Promise.all([
        db.select().from(games).where(eq(games.id, gameId)),
        db.select().from(cafes).where(eq(cafes.id, cafeId)),
      ]);
      if (!game || !cafe) return null;
      const [row] = await db
        .insert(inventoryItems)
        .values({ cafeId, gameId, quantity, status: "available", updatedAt: new Date() })
        .onConflictDoNothing()
        .returning();
      return row ? { ...toInventoryItem(row), game: toGame(game), inUse: 0 } : null;
    },

    async get(cafeId, gameId) {
      return entryOf(cafeId, gameId);
    },

    async update(cafeId, gameId, patch) {
      const current = await entryOf(cafeId, gameId);
      if (!current) return "not-found";
      if (patch.quantity !== undefined && patch.quantity < current.inUse) return "in-use";
      const [row] = await db
        .update(inventoryItems)
        .set({ ...patch, updatedAt: new Date() })
        .where(key(cafeId, gameId))
        .returning();
      return { ...toInventoryItem(row), game: current.game, inUse: current.inUse };
    },

    async remove(cafeId, gameId) {
      const current = await entryOf(cafeId, gameId);
      if (!current) return "not-found";
      if (current.inUse > 0) return "in-use";
      await db.delete(inventoryItems).where(key(cafeId, gameId));
      return true;
    },

    async summarize(cafeIds, maintenanceLimit = 5) {
      if (cafeIds.length === 0) return summarizeRows([], [], new Map(), maintenanceLimit);
      const [cafeRows, rows] = await Promise.all([
        db.select().from(cafes).where(inArray(cafes.id, cafeIds)),
        db
          .select()
          .from(inventoryItems)
          .innerJoin(games, eq(games.id, inventoryItems.gameId))
          .where(inArray(inventoryItems.cafeId, cafeIds)),
      ]);
      // 매장 순서는 요청 순서(화면에서 정한 순서)를 따른다.
      const order = new Map(cafeIds.map((id, i) => [id, i]));
      const scoped = cafeRows.map(toCafe).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      const gameById = new Map(rows.map((r) => [r.games.id, toGame(r.games)]));
      return summarizeRows(
        scoped,
        rows.map((r) => toInventoryItem(r.inventory_items)),
        gameById,
        maintenanceLimit,
      );
    },
  };
}

/** 매장·재고·게임으로 대시보드 요약을 계산한다 (DB와 무관한 순수 함수). */
export function summarizeRows(
  scoped: Cafe[],
  items: InventoryItem[],
  games: Map<string, BoardGame>,
  maintenanceLimit: number,
): InventorySummary {
  const stats = (list: InventoryItem[]) => ({
    gameCount: list.length,
    boxCount: list.filter((i) => i.status !== "retired").reduce((sum, i) => sum + i.quantity, 0),
    maintenanceCount: list.filter((i) => i.status === "maintenance").length,
    retiredCount: list.filter((i) => i.status === "retired").length,
  });
  const categories = GAME_CATEGORIES.map((category) => {
    const inCategory = items.filter(
      (i) => i.status !== "retired" && games.get(i.gameId)!.categories.includes(category),
    );
    return {
      category,
      gameCount: new Set(inCategory.map((i) => i.gameId)).size,
      boxCount: inCategory.reduce((sum, i) => sum + i.quantity, 0),
    };
  });
  const cafeById = new Map(scoped.map((c) => [c.id, c]));
  const maintenance = items
    .filter((i) => i.status === "maintenance")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, maintenanceLimit)
    .map((i) => ({ ...i, game: { ...games.get(i.gameId)! }, inUse: 0, cafe: { ...cafeById.get(i.cafeId)! } }));
  const activeGames = [
    ...new Set(items.filter((i) => i.status !== "retired").map((i) => i.gameId)),
  ].map((id) => games.get(id)!);
  return {
    ...distributions(activeGames),
    cafes: scoped.map((cafe) => ({ cafe: { ...cafe }, ...stats(items.filter((i) => i.cafeId === cafe.id)) })),
    totals: {
      cafeCount: scoped.length,
      ...stats(items),
      // 여러 매장이 같은 게임을 가져도 종류는 하나로 센다.
      gameCount: new Set(items.map((i) => i.gameId)).size,
    },
    categories,
    maintenance,
  };
}
