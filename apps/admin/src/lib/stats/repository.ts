import { byGameName } from "@/lib/games/repository";
import type { MockDb } from "@/lib/mock-db";
import { DAY, KST_OFFSET, minutesBetween, startOfKstDay, toKstDate } from "@/lib/plays/time";
import type { PlaySession } from "@/lib/plays/types";

import type {
  CafeStats,
  GameTurnover,
  HeatmapCell,
  StatPeriod,
  StatsSummary,
} from "./types";
import { WEEKDAYS } from "./types";

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

export function createStatsRepository(db: MockDb): StatsRepository {
  return {
    async summarize(cafeIds, period, now) {
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
      const seenHours = inScope.map((p) => kstWeekdayHour(p.startedAt).hour);
      const minHour = seenHours.length ? Math.min(...seenHours) : 12;
      const maxHour = seenHours.length ? Math.max(...seenHours) : 23;
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
      const playsByGame = new Map<string, PlaySession[]>();
      for (const p of current) {
        playsByGame.set(p.gameId, [...(playsByGame.get(p.gameId) ?? []), p]);
      }
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

      // 매장 비교
      const cafes: CafeStats[] = cafeIds.flatMap((cafeId) => {
        const cafe = db.cafes.find((c) => c.id === cafeId);
        if (!cafe) return [];
        const mine = current.filter((p) => p.cafeId === cafeId);
        const boxes = db.inventory
          .filter((i) => i.cafeId === cafeId && i.status !== "retired")
          .reduce((s, i) => s + i.quantity, 0);
        return [
          {
            cafeId,
            cafeName: cafe.name,
            plays: {
              current: mine.length,
              previous: previous.filter((p) => p.cafeId === cafeId).length,
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
        heatmap: { hours, cells, max: Math.max(0, ...cells.map((c) => c.count)) },
        turnover,
        cafes,
      };
    },
  };
}
