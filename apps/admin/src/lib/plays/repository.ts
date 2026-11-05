import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt } from "drizzle-orm";

import type { Database } from "@/db";
import { newId } from "@/db/ids";
import { toGame, toPlay } from "@/db/mappers";
import { cafes, games, inventoryItems, playSessions } from "@/db/schema";
import { byGameName, matchesGame } from "@/lib/games/repository";
import { countInUse } from "@/lib/inventory/repository";
import { slice, type ListRange, type ListResult } from "@/lib/list";

import type { PlayStartInput } from "./schema";
import { DAY, kstDayRange, startOfKstDay } from "./time";
import type { PlayEntry, PlayHistoryFilter, PopularGame, RentableGame } from "./types";

/**
 * - unavailable: 이용 가능 상태가 아니거나 남은 박스가 없음
 * - closed: 폐점한 매장
 */
export type PlayStartError = "not-found" | "unavailable" | "closed";

/** 대시보드용 이용 현황 */
export type PlayUsage = {
  /** 지금 이용 중 */
  inUse: number;
  /** 오늘(한국 시간 0시부터) 이용 시작 횟수 */
  today: number;
  /** 최근 7일 이용 시작 횟수 */
  week: number;
};

export type PlayUsageSummary = {
  totals: PlayUsage;
  cafes: ({ cafeId: string } & PlayUsage)[];
};

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface PlayRepository {
  /** cafeIds 매장들의 now 기준 이용 현황 (매장 순서는 cafeIds 순서) */
  usage(cafeIds: string[], now: Date): Promise<PlayUsageSummary>;
  /** [from, to) 기간에 cafeIds 매장에서 많이 이용된 게임 순위 (이용 시작 기준) */
  ranking(cafeIds: string[], range: { from: Date; to: Date }, limit?: number): Promise<PopularGame[]>;
  /** 지금 이용 중, 먼저 시작한 순 */
  listActive(cafeId: string): Promise<PlayEntry[]>;
  /** 반납한 기록, 최근에 시작한 순 */
  listHistory(cafeId: string, filter?: PlayHistoryFilter, range?: ListRange): Promise<ListResult<PlayEntry>>;
  /** 지금 빌려줄 수 있는 게임, 이름순 */
  listRentable(cafeId: string): Promise<RentableGame[]>;
  start(cafeId: string, input: PlayStartInput): Promise<PlayEntry | PlayStartError>;
  /** 이용 중인 기록을 반납한다. 없거나 이미 반납했으면 null */
  return(cafeId: string, id: string): Promise<PlayEntry | null>;
  /** 잘못 입력한 이용 중 기록을 지운다. 없거나 이미 반납했으면 false */
  cancel(cafeId: string, id: string): Promise<boolean>;
}

export function createPlayRepository(db: Database): PlayRepository {
  const withGame = { play: playSessions, game: games };
  const toEntry = (r: { play: typeof playSessions.$inferSelect; game: typeof games.$inferSelect }): PlayEntry => ({
    ...toPlay(r.play),
    game: toGame(r.game),
  });
  const active = (cafeId: string, id: string) =>
    and(eq(playSessions.id, id), eq(playSessions.cafeId, cafeId), isNull(playSessions.returnedAt));

  async function rentable(cafeId: string): Promise<RentableGame[]> {
    const [rows, inUse] = await Promise.all([
      db
        .select()
        .from(inventoryItems)
        .innerJoin(games, eq(games.id, inventoryItems.gameId))
        .where(and(eq(inventoryItems.cafeId, cafeId), eq(inventoryItems.status, "available"))),
      countInUse(db, cafeId),
    ]);
    return rows.flatMap((r) => {
      const available = r.inventory_items.quantity - (inUse.get(r.games.id) ?? 0);
      return available > 0
        ? [{ game: toGame(r.games), available, quantity: r.inventory_items.quantity }]
        : [];
    });
  }

  return {
    async usage(cafeIds, now) {
      const nowTime = now.getTime();
      const todayStart = startOfKstDay(nowTime);
      const weekStart = nowTime - 7 * DAY;
      const empty = () => ({ inUse: 0, today: 0, week: 0 });
      const byCafe = new Map(cafeIds.map((id) => [id, empty()]));
      const totals = empty();
      if (cafeIds.length > 0) {
        const rows = await db
          .select({
            cafeId: playSessions.cafeId,
            startedAt: playSessions.startedAt,
            returnedAt: playSessions.returnedAt,
          })
          .from(playSessions)
          .where(
            and(
              inArray(playSessions.cafeId, cafeIds),
              gte(playSessions.startedAt, new Date(Math.min(todayStart, weekStart))),
            ),
          );
        // 7일보다 오래 이용 중인 기록도 '지금 이용 중'에 넣는다.
        const longActive = await db
          .select({ cafeId: playSessions.cafeId, n: count() })
          .from(playSessions)
          .where(
            and(
              inArray(playSessions.cafeId, cafeIds),
              isNull(playSessions.returnedAt),
              lt(playSessions.startedAt, new Date(Math.min(todayStart, weekStart))),
            ),
          )
          .groupBy(playSessions.cafeId);
        for (const r of longActive) {
          byCafe.get(r.cafeId)!.inUse += r.n;
          totals.inUse += r.n;
        }
        for (const r of rows) {
          const usage = byCafe.get(r.cafeId)!;
          const started = r.startedAt.getTime();
          if (started > nowTime) continue;
          const add = (key: keyof typeof totals) => {
            usage[key]++;
            totals[key]++;
          };
          if (!r.returnedAt) add("inUse");
          if (started >= todayStart) add("today");
          if (started >= weekStart) add("week");
        }
      }
      return { totals, cafes: cafeIds.map((cafeId) => ({ cafeId, ...byCafe.get(cafeId)! })) };
    },

    async ranking(cafeIds, { from, to }, limit = 10) {
      if (cafeIds.length === 0) return [];
      const playCount = count();
      const rows = await db
        .select({ game: games, playCount })
        .from(playSessions)
        .innerJoin(games, eq(games.id, playSessions.gameId))
        .where(
          and(
            inArray(playSessions.cafeId, cafeIds),
            gte(playSessions.startedAt, from),
            lt(playSessions.startedAt, to),
          ),
        )
        .groupBy(games.id);
      return rows
        .map((r) => ({ game: toGame(r.game), playCount: r.playCount }))
        // 이용 횟수가 같으면 이름순
        .sort((a, b) => b.playCount - a.playCount || byGameName(a.game, b.game))
        .slice(0, limit)
        .map((entry, i) => ({ rank: i + 1, ...entry }));
    },

    async listActive(cafeId) {
      const rows = await db
        .select(withGame)
        .from(playSessions)
        .innerJoin(games, eq(games.id, playSessions.gameId))
        .where(and(eq(playSessions.cafeId, cafeId), isNull(playSessions.returnedAt)))
        .orderBy(asc(playSessions.startedAt));
      return rows.map(toEntry);
    },

    async listHistory(cafeId, filter = {}, range) {
      const day = filter.date ? kstDayRange(filter.date) : null;
      const rows = await db
        .select(withGame)
        .from(playSessions)
        .innerJoin(games, eq(games.id, playSessions.gameId))
        .where(
          and(
            eq(playSessions.cafeId, cafeId),
            isNotNull(playSessions.returnedAt),
            day ? gte(playSessions.startedAt, new Date(day.from)) : undefined,
            day ? lt(playSessions.startedAt, new Date(day.to)) : undefined,
          ),
        )
        .orderBy(desc(playSessions.startedAt));
      return slice(rows.map(toEntry).filter((e) => matchesGame(e.game, { q: filter.q })), range);
    },

    async listRentable(cafeId) {
      return (await rentable(cafeId)).sort((a, b) => byGameName(a.game, b.game));
    },

    async start(cafeId, input) {
      const [[cafe], [game]] = await Promise.all([
        db.select().from(cafes).where(eq(cafes.id, cafeId)),
        db.select().from(games).where(eq(games.id, input.gameId)),
      ]);
      if (!cafe || !game) return "not-found";
      if (cafe.status !== "open") return "closed";
      // 마지막 박스를 두 직원이 동시에 빌려주지 않도록 재고 줄을 잠그고 확인한다.
      return db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(inventoryItems)
          .where(and(eq(inventoryItems.cafeId, cafeId), eq(inventoryItems.gameId, input.gameId)))
          .for("update");
        if (!item || item.status !== "available") return "unavailable" as const;
        const [{ n }] = await tx
          .select({ n: count() })
          .from(playSessions)
          .where(
            and(
              eq(playSessions.cafeId, cafeId),
              eq(playSessions.gameId, input.gameId),
              isNull(playSessions.returnedAt),
            ),
          );
        if (item.quantity - n <= 0) return "unavailable" as const;
        const [row] = await tx
          .insert(playSessions)
          .values({
            id: newId("p"),
            cafeId,
            gameId: input.gameId,
            startedAt: new Date(),
            playerCount: input.playerCount,
            table: input.table ?? null,
          })
          .returning();
        return { ...toPlay(row), game: toGame(game) };
      });
    },

    async return(cafeId, id) {
      const [row] = await db
        .update(playSessions)
        .set({ returnedAt: new Date() })
        .where(active(cafeId, id))
        .returning();
      if (!row) return null;
      const [game] = await db.select().from(games).where(eq(games.id, row.gameId));
      return { ...toPlay(row), game: toGame(game) };
    },

    async cancel(cafeId, id) {
      const rows = await db.delete(playSessions).where(active(cafeId, id)).returning({ id: playSessions.id });
      return rows.length > 0;
    },
  };
}
