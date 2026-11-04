import { describe, expect, it } from "vitest";

import type { Cafe } from "@/lib/cafes/types";
import type { BoardGame } from "@/lib/games/types";
import type { InventoryItem } from "@/lib/inventory/types";
import { createMockDb } from "@/lib/mock-db";
import type { PlaySession } from "@/lib/plays/types";

import { createStatsRepository } from "./repository";
import { changeRate, parseStatPeriod } from "./schema";

const cafe = (id: string): Cafe => ({ id, name: `${id}점`, region: "", openedAt: "", status: "open" });
const game = (id: string, name: string): BoardGame => ({
  id,
  name,
  categories: ["family"],
  minPlayers: 2,
  maxPlayers: 4,
  playTimeMin: 30,
  playTimeMax: 60,
  difficulty: "easy",
  createdAt: "",
});
const item = (cafeId: string, gameId: string, quantity: number, status: InventoryItem["status"] = "available"): InventoryItem => ({
  cafeId,
  gameId,
  quantity,
  status,
  updatedAt: "",
});
let seq = 0;
/** kst: "2026-11-02T14:00" 같은 한국 시각, minutes: 이용 시간 (없으면 이용 중) */
const play = (cafeId: string, gameId: string, kst: string, minutes?: number, playerCount = 2): PlaySession => {
  const start = Date.parse(`${kst}:00+09:00`);
  return {
    id: `p${++seq}`,
    cafeId,
    gameId,
    startedAt: new Date(start).toISOString(),
    returnedAt: minutes === undefined ? undefined : new Date(start + minutes * 60_000).toISOString(),
    playerCount,
  };
};

// 지금: 2026-11-04(수) 15:00 한국 시각 → 7일 기간 = 10/28(수)~11/3(화), 지난 기간 = 10/21~10/27
const now = new Date("2026-11-04T06:00:00.000Z");

function setup() {
  const db = createMockDb({
    cafes: [cafe("a"), cafe("b")],
    games: [game("g1", "카탄"), game("g2", "아줄"), game("g3", "딕싯")],
    inventory: [item("a", "g1", 2), item("a", "g2", 1), item("b", "g1", 2), item("b", "g3", 1, "retired")],
    users: [],
    plays: [
      play("a", "g1", "2026-11-03T14:00", 60, 4), // 화 14시
      play("a", "g1", "2026-11-03T14:30", 30, 2), // 화 14시
      play("a", "g2", "2026-10-28T20:00", 90, 3), // 수 20시 (기간 첫날)
      play("b", "g1", "2026-11-02T23:59", 45), //   월 23시
      play("a", "g1", "2026-11-04T13:00"), //        오늘 → 빠짐
      play("a", "g1", "2026-10-27T23:00", 60), //    지난 기간 마지막 날
      play("b", "g1", "2026-10-21T12:00", 60), //    지난 기간 첫날
      play("b", "g1", "2026-10-20T12:00", 60), //    두 기간 밖
    ],
  });
  return createStatsRepository(db);
}

describe("StatsRepository.summarize", () => {
  it("어제까지 온전한 7일을 이번 기간으로, 그 앞 7일을 지난 기간으로 센다 (오늘은 뺀다)", async () => {
    const s = await setup().summarize(["a", "b"], 7, now);
    expect(s.kpis.plays).toEqual({ current: 4, previous: 2 });
    expect(s.kpis.dailyAverage).toEqual({ current: 0.6, previous: 0.3 });
    expect(s.kpis.averageMinutes).toEqual({ current: 56.3, previous: 60 });
    expect(s.kpis.averagePlayers.current).toBe(2.8);
    expect(s.daily.map((d) => d.date)).toEqual([
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(s.daily.map((d) => [d.current, d.previous])).toEqual([
      [1, 1],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [1, 0],
      [2, 1],
    ]);
  });

  it("요일×시간대는 한국 시각으로 세고, 히트맵 시간 범위는 기록이 있는 시간대다", async () => {
    const s = await setup().summarize(["a", "b"], 7, now);
    const at = (weekday: number, hour: number) =>
      s.heatmap.cells.find((c) => c.weekday === weekday && c.hour === hour)?.count;
    expect(at(2, 14)).toBe(2); // 화 14시
    expect(at(3, 20)).toBe(1); // 수 20시
    expect(at(1, 23)).toBe(1); // 월 23시 59분 (UTC로는 14시라 날짜·시간 모두 한국 기준이어야 맞음)
    expect(s.heatmap.max).toBe(2);
    expect(s.heatmap.hours[0]).toBe(12);
    expect(s.heatmap.hours.at(-1)).toBe(23);
    // 월요일부터 시작
    expect(s.heatmap.cells[0].weekday).toBe(1);
  });

  it("게임 회전율: 폐기 제외 보유 박스 대비 이용 횟수, 많은 순", async () => {
    const s = await setup().summarize(["a", "b"], 7, now);
    expect(s.turnover.map((t) => [t.game.name, t.boxes, t.plays, t.playsPerBox])).toEqual([
      ["아줄", 1, 1, 1],
      ["카탄", 4, 3, 0.8],
    ]);
  });

  it("매장 비교: 매장마다 이번·지난 기간 이용, 박스당 이용, 일별 추이", async () => {
    const s = await setup().summarize(["a", "b"], 7, now);
    expect(s.cafes.map((c) => [c.cafeName, c.plays.current, c.plays.previous, c.playsPerBox])).toEqual([
      ["a점", 3, 1, 1],
      ["b점", 1, 1, 0.5],
    ]);
    expect(s.cafes[0].daily).toEqual([1, 0, 0, 0, 0, 0, 2]);
  });

  it("범위를 매장 하나로 좁힐 수 있고, 기록이 없으면 평균은 비어 있다", async () => {
    const s = await setup().summarize(["b"], 7, now);
    expect(s.kpis.plays.current).toBe(1);
    expect(s.cafes.map((c) => c.cafeId)).toEqual(["b"]);
    const empty = await setup().summarize(["nope"], 7, now);
    expect(empty.kpis.averageMinutes).toEqual({ current: null, previous: null });
    expect(empty.heatmap.max).toBe(0);
  });

  it("시드 데이터로 28일을 보면 지난 기간까지 모두 채워진다", async () => {
    const db = createMockDb({}, now);
    const s = await createStatsRepository(db).summarize(db.cafes.map((c) => c.id), 28, now);
    expect(s.daily.every((d) => d.current > 0 && d.previous > 0)).toBe(true);
    expect(s.turnover.length).toBeGreaterThan(50);
  });
});

describe("helpers", () => {
  it("기간 파라미터는 7·14·28만, 나머지는 기본 28", () => {
    expect(parseStatPeriod({ period: "14" })).toBe(14);
    expect(parseStatPeriod({ period: "90" })).toBe(28);
    expect(parseStatPeriod({})).toBe(28);
  });
  it("증감률은 소수 한 자리, 지난 기간이 0이면 null", () => {
    expect(changeRate(110, 100)).toBe(10);
    expect(changeRate(2, 3)).toBe(-33.3);
    expect(changeRate(5, 0)).toBeNull();
  });
});
