import { describe, expect, it } from "vitest";

import type { Cafe } from "@/entities/cafe";
import type { BoardGame } from "@/entities/game";
import { fromPlay } from "@/db/mappers";
import { playSessions } from "@/db/schema";
import { createSeedData } from "@/db/seed-data";
import { createTestDb } from "@/db/testing";

import { createInventoryRepository, distributions } from "./repository";
import { createSeedInventory } from "./seed";
import type { InventoryItem } from "@/entities/inventory";

const cafe = (id: string): Cafe => ({ id, name: id, region: "", openedAt: "2024-01-01", status: "open" });
const game = (id: string, name: string, categories: BoardGame["categories"]): BoardGame => ({
  id,
  name,
  categories,
  minPlayers: 2,
  maxPlayers: 4,
  playTimeMin: 30,
  playTimeMax: 60,
  difficulty: "normal",
  createdAt: "2026-10-01T00:00:00.000Z",
});
const item = (
  cafeId: string,
  gameId: string,
  patch: Partial<InventoryItem> = {},
): InventoryItem => ({
  cafeId,
  gameId,
  quantity: 1,
  status: "available",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...patch,
});

async function setup() {
  const db = await createTestDb({
    cafes: [cafe("a"), cafe("b")],
    games: [
      game("g1", "카탄", ["family", "strategy"]),
      game("g2", "아줄", ["abstract"]),
      game("g3", "딕싯", ["party"]),
    ],
    plays: [],
    users: [],
    reservations: [],
    waitlist: [],
    inventory: [
      item("a", "g1", { quantity: 3 }),
      item("a", "g2", { status: "maintenance", updatedAt: "2026-10-05T00:00:00.000Z" }),
      item("b", "g1", { quantity: 2, status: "retired" }),
      item("b", "g3", { status: "maintenance", updatedAt: "2026-10-09T00:00:00.000Z" }),
    ],
  });
  return { db, repo: createInventoryRepository(db) };
}

describe("InventoryRepository", () => {
  it("매장별로 나눠 보여주고, 게임 이름·카테고리·상태로 거른다", async () => {
    const { repo } = await setup();
    expect((await repo.list("a")).items.map((e) => e.game.name)).toEqual(["아줄", "카탄"]);
    expect((await repo.list("a", { status: "maintenance" })).items.map((e) => e.gameId)).toEqual(["g2"]);
    expect((await repo.list("a", { category: "strategy" })).items.map((e) => e.gameId)).toEqual(["g1"]);
    expect((await repo.list("b", { q: "딕" })).total).toBe(1);
  });

  it("추가 후보는 그 매장에 없는 게임만이다", async () => {
    const { repo } = await setup();
    expect((await repo.listAddable("a")).map((g) => g.id)).toEqual(["g3"]);
  });

  it("추가하면 '이용 가능'으로 들어가고, 이미 있거나 없는 매장·게임이면 null", async () => {
    const { repo } = await setup();
    const added = await repo.add("a", "g3", 2);
    expect(added).toMatchObject({ cafeId: "a", gameId: "g3", quantity: 2, status: "available" });
    expect(await repo.add("a", "g3", 1)).toBeNull();
    expect(await repo.add("nope", "g1", 1)).toBeNull();
    expect(await repo.add("a", "nope", 1)).toBeNull();
  });

  it("수정하면 최근 변경 시각이 바뀌고, 다른 매장 재고에는 영향이 없다", async () => {
    const { repo } = await setup();
    const updated = await repo.update("a", "g1", { quantity: 5, status: "maintenance" });
    expect(updated).toMatchObject({ quantity: 5, status: "maintenance" });
    expect(typeof updated !== "string" && updated.updatedAt > "2026-10-01").toBe(true);
    expect((await repo.list("b", { q: "카탄" })).items[0]).toMatchObject({
      quantity: 2,
      status: "retired",
    });
    expect(await repo.update("a", "g3", { quantity: 1 })).toBe("not-found");
  });

  it("제외하면 그 매장에서만 빠진다", async () => {
    const { repo } = await setup();
    expect(await repo.remove("a", "g1")).toBe(true);
    expect(await repo.remove("a", "g1")).toBe("not-found");
    expect((await repo.list("a")).total).toBe(1);
    expect((await repo.list("b")).total).toBe(2);
  });

  it("이용 중인 박스: 목록에 수를 보여주고, 그보다 적게 줄이거나 제외할 수 없다", async () => {
    const { db, repo } = await setup();
    await db.insert(playSessions).values(
      [
      { id: "p1", cafeId: "a", gameId: "g1", startedAt: "2026-11-01T10:00:00.000Z", playerCount: 2 },
      { id: "p2", cafeId: "a", gameId: "g1", startedAt: "2026-11-01T10:00:00.000Z", playerCount: 2 },
      // 반납한 기록과 다른 매장 기록은 세지 않는다.
      { id: "p3", cafeId: "a", gameId: "g1", startedAt: "2026-11-01T09:00:00.000Z", returnedAt: "2026-11-01T10:00:00.000Z", playerCount: 2 },
      { id: "p4", cafeId: "b", gameId: "g1", startedAt: "2026-11-01T10:00:00.000Z", playerCount: 2 },
      ].map(fromPlay),
    );
    expect((await repo.list("a")).items.map((e) => [e.gameId, e.inUse])).toEqual([
      ["g2", 0],
      ["g1", 2],
    ]);
    expect(await repo.update("a", "g1", { quantity: 1 })).toBe("in-use");
    expect(await repo.update("a", "g1", { quantity: 2 })).toMatchObject({ quantity: 2 });
    // 상태는 바꿀 수 있다 (새로 빌려주지 않을 뿐).
    expect(await repo.update("a", "g1", { status: "maintenance" })).toMatchObject({
      status: "maintenance",
    });
    expect(await repo.remove("a", "g1")).toBe("in-use");
    expect(await repo.remove("a", "g2")).toBe(true);
  });

  it("요약: 매장별·전체 집계와 유형 분포, 최근 점검 중 목록", async () => {
    const { repo } = await setup();
    const summary = await repo.summarize(["a", "b"]);

    expect(summary.cafes.map(({ cafe, ...s }) => [cafe.id, s])).toEqual([
      ["a", { gameCount: 2, boxCount: 4, maintenanceCount: 1, retiredCount: 0 }],
      ["b", { gameCount: 2, boxCount: 1, maintenanceCount: 1, retiredCount: 1 }],
    ]);
    // 게임 종류는 매장이 달라도 하나로, 박스는 폐기를 빼고 센다.
    expect(summary.totals).toEqual({
      cafeCount: 2,
      gameCount: 3,
      boxCount: 5,
      maintenanceCount: 2,
      retiredCount: 1,
    });
    const byCategory = Object.fromEntries(
      summary.categories.map((c) => [c.category, [c.gameCount, c.boxCount]]),
    );
    expect(byCategory).toMatchObject({
      family: [1, 3], // b의 카탄은 폐기라 제외
      strategy: [1, 3],
      abstract: [1, 1],
      party: [1, 1],
      wargame: [0, 0],
    });
    expect(summary.maintenance.map((e) => [e.cafe.id, e.gameId])).toEqual([
      ["b", "g3"],
      ["a", "g2"],
    ]);
  });

  it("요약 범위를 매장 하나로 좁힐 수 있다", async () => {
    const { repo } = await setup();
    const summary = await repo.summarize(["b"]);
    expect(summary.cafes.map((c) => c.cafe.id)).toEqual(["b"]);
    expect(summary.totals.gameCount).toBe(2);
    expect(summary.maintenance.every((e) => e.cafeId === "b")).toBe(true);
  });
});

describe("distributions", () => {
  const g = (min: number, max: number, timeMin: number) => ({
    ...game("x", "x", ["family"]),
    minPlayers: min,
    maxPlayers: max,
    playTimeMin: timeMin,
  });

  it("인원수 구간마다 그 인원으로 할 수 있는 게임을 센다", () => {
    const { players } = distributions([g(2, 4, 30), g(1, 1, 30), g(3, 10, 30)]);
    expect(Object.fromEntries(players.map((p) => [p.label, p.gameCount]))).toEqual({
      "1명": 1,
      "2명": 1,
      "3명": 2,
      "4명": 2,
      "5명": 1,
      "6명": 1,
      "7명": 1,
      "8명 이상": 1,
    });
  });

  it("최소 플레이 시간으로 구간을 나누고, 경계값은 아래 구간에 넣는다", () => {
    const { playTime } = distributions([
      g(2, 4, 30),
      g(2, 4, 31),
      g(2, 4, 60),
      g(2, 4, 120),
      g(2, 4, 121),
    ]);
    expect(playTime.map((p) => p.gameCount)).toEqual([1, 2, 0, 1, 1]);
  });

  it("요약의 분포는 폐기를 빼고 같은 게임을 한 번만 센다", async () => {
    const { repo } = await setup();
    // a: g1(카탄 2–4명), g2(아줄, 점검 중) / b: g1(폐기), g3 → 활성 게임 g1·g2·g3
    const summary = await repo.summarize(["a", "b"]);
    expect(summary.players.find((p) => p.label === "2명")?.gameCount).toBe(3);
  });
});

describe("createSeedInventory", () => {
  it("매번 같은 결과를 만들고, 매장마다 카탈로그의 일부를 보유한다", () => {
    const db = createSeedData({ plays: [], reservations: [], waitlist: [] });
    const again = createSeedInventory(db.cafes, db.games);
    expect(again).toEqual(db.inventory);
    // 매장 순서대로 55% · 65% · 75% · 55% · 65% 안팎을 보유한다.
    const expected = [0.55, 0.65, 0.75, 0.55, 0.65];
    db.cafes.forEach((c, i) => {
      const ratio =
        db.inventory.filter((item) => item.cafeId === c.id).length / db.games.length;
      expect(Math.abs(ratio - expected[i])).toBeLessThan(0.12);
    });
    // 상태도 한쪽으로 쏠리지 않는다 (대부분 이용 가능, 일부 점검 중·폐기).
    const share = (status: string) =>
      db.inventory.filter((i) => i.status === status).length / db.inventory.length;
    expect(share("available")).toBeGreaterThan(0.75);
    expect(share("maintenance")).toBeGreaterThan(0.03);
    expect(share("retired")).toBeGreaterThan(0.005);
  });
});
