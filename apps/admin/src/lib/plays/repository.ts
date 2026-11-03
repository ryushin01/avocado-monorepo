import { byGameName, matchesGame } from "@/lib/games/repository";
import type { BoardGame } from "@/lib/games/types";
import { slice, type ListRange, type ListResult } from "@/lib/list";
import type { MockDb } from "@/lib/mock-db";

import type { PlayStartInput } from "./schema";
import { DAY, kstDayRange, startOfKstDay } from "./time";
import type {
  PlayEntry,
  PlayHistoryFilter,
  PlaySession,
  PopularGame,
  RentableGame,
} from "./types";

/** cafeId 매장에서 지금 이용 중인 박스 수 (게임별) */
export function countInUse(plays: PlaySession[], cafeId: string) {
  const counts = new Map<string, number>();
  for (const p of plays) {
    if (p.cafeId === cafeId && !p.returnedAt) {
      counts.set(p.gameId, (counts.get(p.gameId) ?? 0) + 1);
    }
  }
  return counts;
}

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

export interface PlayRepository {
  /** cafeIds 매장들의 now 기준 이용 현황 (매장 순서는 cafeIds 순서) */
  usage(cafeIds: string[], now: Date): Promise<PlayUsageSummary>;
  /** [from, to) 기간에 cafeIds 매장에서 많이 이용된 게임 순위 (이용 시작 기준) */
  ranking(
    cafeIds: string[],
    range: { from: Date; to: Date },
    limit?: number,
  ): Promise<PopularGame[]>;
  /** 지금 이용 중, 먼저 시작한 순 */
  listActive(cafeId: string): Promise<PlayEntry[]>;
  /** 반납한 기록, 최근에 시작한 순 */
  listHistory(
    cafeId: string,
    filter?: PlayHistoryFilter,
    range?: ListRange,
  ): Promise<ListResult<PlayEntry>>;
  /** 지금 빌려줄 수 있는 게임, 이름순 */
  listRentable(cafeId: string): Promise<RentableGame[]>;
  start(cafeId: string, input: PlayStartInput): Promise<PlayEntry | PlayStartError>;
  /** 이용 중인 기록을 반납한다. 없거나 이미 반납했으면 null */
  return(cafeId: string, id: string): Promise<PlayEntry | null>;
  /** 잘못 입력한 이용 중 기록을 지운다. 없거나 이미 반납했으면 false */
  cancel(cafeId: string, id: string): Promise<boolean>;
}

export function createPlayRepository(db: MockDb): PlayRepository {
  const gameById = () => new Map(db.games.map((g) => [g.id, g]));
  const toEntries = (plays: PlaySession[]) => {
    const games = gameById();
    return plays.flatMap((p) => {
      const game = games.get(p.gameId);
      return game ? [{ ...p, game: { ...game } }] : [];
    });
  };
  const findActive = (cafeId: string, id: string) =>
    db.plays.findIndex((p) => p.id === id && p.cafeId === cafeId && !p.returnedAt);

  function rentable(cafeId: string) {
    const inUse = countInUse(db.plays, cafeId);
    const games = gameById();
    return db.inventory.flatMap((item): RentableGame[] => {
      const game = games.get(item.gameId);
      const available = item.quantity - (inUse.get(item.gameId) ?? 0);
      if (item.cafeId !== cafeId || item.status !== "available" || !game || available <= 0) {
        return [];
      }
      return [{ game: { ...game }, available, quantity: item.quantity }];
    });
  }

  return {
    async usage(cafeIds, now) {
      const nowTime = now.getTime();
      const todayStart = startOfKstDay(nowTime);
      const weekStart = nowTime - 7 * DAY;
      const empty = (): PlayUsage => ({ inUse: 0, today: 0, week: 0 });
      const byCafe = new Map(cafeIds.map((id) => [id, empty()]));
      const totals = empty();
      for (const p of db.plays) {
        const usage = byCafe.get(p.cafeId);
        if (!usage) continue;
        const started = Date.parse(p.startedAt);
        if (started > nowTime) continue;
        const add = (key: keyof PlayUsage) => {
          usage[key]++;
          totals[key]++;
        };
        if (!p.returnedAt) add("inUse");
        if (started >= todayStart) add("today");
        if (started >= weekStart) add("week");
      }
      return { totals, cafes: cafeIds.map((cafeId) => ({ cafeId, ...byCafe.get(cafeId)! })) };
    },

    async ranking(cafeIds, { from, to }, limit = 10) {
      const scope = new Set(cafeIds);
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const counts = new Map<string, number>();
      for (const play of db.plays) {
        if (!scope.has(play.cafeId)) continue;
        if (play.startedAt < fromIso || play.startedAt >= toIso) continue;
        counts.set(play.gameId, (counts.get(play.gameId) ?? 0) + 1);
      }
      const games = gameById();
      return [...counts]
        .flatMap(([gameId, playCount]) => {
          const game = games.get(gameId);
          return game ? [{ game: { ...game }, playCount }] : [];
        })
        // 이용 횟수가 같으면 이름순
        .sort((a, b) => b.playCount - a.playCount || byGameName(a.game, b.game))
        .slice(0, limit)
        .map((entry, i) => ({ rank: i + 1, ...entry }));
    },

    async listActive(cafeId) {
      return toEntries(
        db.plays
          .filter((p) => p.cafeId === cafeId && !p.returnedAt)
          .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      );
    },

    async listHistory(cafeId, filter = {}, range) {
      const day = filter.date ? kstDayRange(filter.date) : null;
      const entries = toEntries(
        db.plays.filter((p) => {
          if (p.cafeId !== cafeId || !p.returnedAt) return false;
          if (!day) return true;
          const t = Date.parse(p.startedAt);
          return t >= day.from && t < day.to;
        }),
      )
        .filter((e) => matchesGame(e.game, { q: filter.q }))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      return slice(entries, range);
    },

    async listRentable(cafeId) {
      return rentable(cafeId).sort((a, b) => byGameName(a.game, b.game));
    },

    async start(cafeId, input) {
      const cafe = db.cafes.find((c) => c.id === cafeId);
      const game: BoardGame | undefined = db.games.find((g) => g.id === input.gameId);
      if (!cafe || !game) return "not-found";
      if (cafe.status !== "open") return "closed";
      if (!rentable(cafeId).some((r) => r.game.id === input.gameId)) return "unavailable";
      const play: PlaySession = {
        id: `p_${db.nextPlayId++}`,
        cafeId,
        gameId: input.gameId,
        startedAt: new Date().toISOString(),
        playerCount: input.playerCount,
        table: input.table,
      };
      db.plays.push(play);
      return { ...play, game: { ...game } };
    },

    async return(cafeId, id) {
      const index = findActive(cafeId, id);
      if (index === -1) return null;
      db.plays[index] = { ...db.plays[index], returnedAt: new Date().toISOString() };
      return toEntries([db.plays[index]])[0] ?? null;
    },

    async cancel(cafeId, id) {
      const index = findActive(cafeId, id);
      if (index === -1) return false;
      db.plays.splice(index, 1);
      return true;
    },
  };
}
