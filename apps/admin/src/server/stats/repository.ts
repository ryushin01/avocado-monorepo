import { byGameName } from "@/server/games/repository";
import { and, gte, inArray, lt } from "drizzle-orm";

import type { Database } from "@/db/index";
import { toCafe, toGame, toInventoryItem, toPlay } from "@/db/mappers";
import {
  cafes as cafeTable,
  games as gameTable,
  inventoryItems,
  playSessions,
} from "@/db/schema";
import {
  DAY,
  KST_OFFSET,
  minutesBetween,
  startOfKstDay,
  toKstDate,
} from "@/shared/lib/kst-time";
import type { Cafe } from "@/entities/cafe";
import type { BoardGame } from "@/entities/game";
import type { InventoryItem } from "@/entities/inventory";
import type { PlaySession } from "@/entities/play";

import type {
  CafeStats,
  GameTurnover,
  HeatmapCell,
  StatPeriod,
  StatsSummary,
} from "@/entities/stats";
import { WEEKDAYS } from "@/entities/stats";

const HOUR = 3_600_000;

/** 평균. 값이 없으면 null */
const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/** 반납한 기록의 이용 시간(분) */
const durations = (plays: PlaySession[]) =>
  plays.flatMap((p) => (p.returnedAt ? [minutesBetween(p.startedAt, p.returnedAt)] : []));

/** 한국 시간 기준 요일(0=일)과 시(0~23) */
function kstWeekdayHour(iso: string) {
  const kst = new Date(Date.parse(iso) + KST_OFFSET);
  return { weekday: kst.getUTCDay(), hour: kst.getUTCHours() };
}

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. 집계는 백엔드에서 하는 편이 낫다. */
export interface StatsRepository {
  /**
   * cafeIds 매장들의 통계. 이번 기간은 now의 한국 날짜 기준 어제까지 period일,
   * 지난 기간은 그 앞 period일이다(오늘은 아직 끝나지 않아 비교에서 뺀다).
   */
  summarize(cafeIds: string[], period: StatPeriod, now: Date): Promise<StatsSummary>;
}

export function createStatsRepository(database: Database): StatsRepository {
  return {
    async summarize(cafeIds, period, now) {
      const { from, to } = statWindow(period, now);
      const data = await loadStatsData(database, cafeIds, new Date(from), new Date(to));
      return summarizeStats(data, cafeIds, period, now);
    },
  };
}

/** 통계 계산에 쓰는 행 (loadStatsData가 읽는다) */
export type StatsData = {
  plays: PlaySession[];
  inventory: InventoryItem[];
  games: BoardGame[];
  cafes: Cafe[];
};

/** 지난 기간 시작부터 오늘 0시(제외)까지 */
function statWindow(period: StatPeriod, now: Date) {
  const to = startOfKstDay(now.getTime());
  return { from: to - 2 * period * DAY, to };
}

/** 같은 키끼리 모은다. 배열을 복사하지 않고 넣어 기록이 많아도 한 번에 끝난다. */
function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/**
 * 읽어 온 행으로 통계를 계산한다 (DB와 무관한 순수 함수).
 * 기록이 수십만 건이어도 멈추지 않도록 Math.min(...배열)처럼 인수를 펼치지 않는다(약 12만 개부터 RangeError).
 */
export function summarizeStats(db: StatsData, cafeIds: string[], period: StatPeriod, now: Date): StatsSummary {
  const scope = new Set(cafeIds);
  const to = startOfKstDay(now.getTime()); // 오늘 0시 (제외)
  const from = to - period * DAY;
  const prevFrom = from - period * DAY;

  const inScope = db.plays.filter((p) => scope.has(p.cafeId));
  const between = (start: number, end: number) =>
    inScope.filter((p) => {
      const t = Date.parse(p.startedAt);
      return t >= start && t < end;
    });
  const current = between(from, to);
  const previous = between(prevFrom, from);

  // 일별 (이번 기간 i번째 날 ↔ 지난 기간 i번째 날)
  const dayIndex = (iso: string, start: number) =>
    Math.floor((Date.parse(iso) - start) / DAY);
  const countByDay = (plays: PlaySession[], start: number) => {
    const counts = Array.from({ length: period }, () => 0);
    for (const p of plays) counts[dayIndex(p.startedAt, start)]++;
    return counts;
  };
  const currentDaily = countByDay(current, from);
  const previousDaily = countByDay(previous, prevFrom);
  // toKstDate는 UTC 시각을 받으므로 그날 정오(한국)를 넘겨 날짜가 밀리지 않게 한다.
  const daily = currentDaily.map((count, i) => ({
    date: toKstDate(from + i * DAY + 12 * HOUR),
    current: count,
    previous: previousDaily[i],
  }));

  // 요일 × 시간대
  const cellCounts = new Map<string, number>();
  for (const p of current) {
    const { weekday, hour } = kstWeekdayHour(p.startedAt);
    const key = `${weekday}:${hour}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  // 기록이 있는 시간대만 보여 준다. 기록이 없으면 12~23시
  let minHour = 24;
  let maxHour = -1;
  for (const p of inScope) {
    const { hour } = kstWeekdayHour(p.startedAt);
    if (hour < minHour) minHour = hour;
    if (hour > maxHour) maxHour = hour;
  }
  if (maxHour < 0) [minHour, maxHour] = [12, 23];
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const cells: HeatmapCell[] = WEEKDAYS.flatMap((weekday) =>
    hours.map((hour) => ({ weekday, hour, count: cellCounts.get(`${weekday}:${hour}`) ?? 0 })),
  );

  // 게임 회전율: 범위 안 매장의 보유 박스(폐기 제외) 대비 이용 횟수
  const games = new Map(db.games.map((g) => [g.id, g]));
  const boxesByGame = new Map<string, number>();
  for (const item of db.inventory) {
    if (!scope.has(item.cafeId) || item.status === "retired") continue;
    boxesByGame.set(item.gameId, (boxesByGame.get(item.gameId) ?? 0) + item.quantity);
  }
  const playsByGame = groupBy(current, (p) => p.gameId);
  const turnover: GameTurnover[] = [...boxesByGame]
    .flatMap(([gameId, boxes]) => {
      const game = games.get(gameId);
      if (!game) return [];
      const plays = playsByGame.get(gameId) ?? [];
      return [
        {
          game: { ...game },
          boxes,
          plays: plays.length,
          playsPerBox: Math.round((plays.length / boxes) * 10) / 10,
          averageMinutes: round1(average(durations(plays))),
        },
      ];
    })
    .sort((a, b) => b.playsPerBox - a.playsPerBox || byGameName(a.game, b.game));

  // 매장 비교: 매장마다 전체 기록을 다시 훑지 않도록 한 번에 나눠 둔다.
  const cafeById = new Map(db.cafes.map((c) => [c.id, c]));
  const currentByCafe = groupBy(current, (p) => p.cafeId);
  const previousByCafe = groupBy(previous, (p) => p.cafeId);
  const boxesByCafe = new Map<string, number>();
  for (const item of db.inventory) {
    if (item.status === "retired") continue;
    boxesByCafe.set(item.cafeId, (boxesByCafe.get(item.cafeId) ?? 0) + item.quantity);
  }
  const cafes: CafeStats[] = cafeIds.flatMap((cafeId) => {
    const cafe = cafeById.get(cafeId);
    if (!cafe) return [];
    const mine = currentByCafe.get(cafeId) ?? [];
    const boxes = boxesByCafe.get(cafeId) ?? 0;
    return [
      {
        cafeId,
        cafeName: cafe.name,
        plays: {
          current: mine.length,
          previous: previousByCafe.get(cafeId)?.length ?? 0,
        },
        averageMinutes: round1(average(durations(mine))),
        playsPerBox: boxes === 0 ? 0 : Math.round((mine.length / boxes) * 10) / 10,
        daily: countByDay(mine, from),
      },
    ];
  });

  return {
    period,
    current: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    previous: { from: new Date(prevFrom).toISOString(), to: new Date(from).toISOString() },
    kpis: {
      plays: { current: current.length, previous: previous.length },
      dailyAverage: {
        current: Math.round((current.length / period) * 10) / 10,
        previous: Math.round((previous.length / period) * 10) / 10,
      },
      averageMinutes: {
        current: round1(average(durations(current))),
        previous: round1(average(durations(previous))),
      },
      averagePlayers: {
        current: round1(average(current.map((p) => p.playerCount))),
        previous: round1(average(previous.map((p) => p.playerCount))),
      },
    },
    daily,
    heatmap: { hours, cells, max: cells.reduce((m, c) => Math.max(m, c.count), 0) },
    turnover,
    cafes,
  };
}

/** 통계에 필요한 행만 읽는다: 범위 매장의 두 기간 이용 기록, 재고, 게임, 매장 */
async function loadStatsData(db: Database, cafeIds: string[], from: Date, to: Date): Promise<StatsData> {
  if (cafeIds.length === 0) return { plays: [], inventory: [], games: [], cafes: [] };
  const [plays, inventory, games, cafes] = await Promise.all([
    db
      .select()
      .from(playSessions)
      .where(
        and(
          inArray(playSessions.cafeId, cafeIds),
          gte(playSessions.startedAt, from),
          lt(playSessions.startedAt, to),
        ),
      ),
    db.select().from(inventoryItems).where(inArray(inventoryItems.cafeId, cafeIds)),
    db.select().from(gameTable),
    db.select().from(cafeTable).where(inArray(cafeTable.id, cafeIds)),
  ]);
  return {
    plays: plays.map(toPlay),
    inventory: inventory.map(toInventoryItem),
    games: games.map(toGame),
    cafes: cafes.map(toCafe),
  };
}
