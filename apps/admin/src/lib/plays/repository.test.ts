import { describe, expect, it } from "vitest";

import type { BoardGame } from "@/lib/games/types";
import { createMockDb } from "@/lib/mock-db";

import { createPlayRepository } from "./repository";
import { createSeedPlays } from "./seed";
import type { PlaySession } from "./types";

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
let seq = 0;
const play = (
  cafeId: string,
  gameId: string,
  startedAt: string,
  patch: Partial<PlaySession> = {},
): PlaySession => ({
  id: `p${++seq}`,
  cafeId,
  gameId,
  startedAt,
  // 기본은 한 시간 뒤 반납
  returnedAt: new Date(Date.parse(startedAt) + 3_600_000).toISOString(),
  playerCount: 3,
  ...patch,
});

function setup() {
  const db = createMockDb({
    cafes: [],
    games: [game("g1", "카탄"), game("g2", "아줄"), game("g3", "딕싯")],
    inventory: [],
    plays: [
      play("a", "g1", "2026-11-01T10:00:00.000Z"),
      play("a", "g1", "2026-11-02T10:00:00.000Z"),
      play("a", "g2", "2026-11-02T11:00:00.000Z"),
      play("a", "g3", "2026-11-02T12:00:00.000Z"),
      play("b", "g3", "2026-11-02T10:00:00.000Z"),
      play("b", "g3", "2026-11-02T11:00:00.000Z"),
      play("b", "g3", "2026-11-02T12:00:00.000Z"),
      play("a", "g2", "2026-10-01T10:00:00.000Z"), // 기간 밖
    ],
  });
  return createPlayRepository(db);
}

const range = {
  from: new Date("2026-10-27T00:00:00.000Z"),
  to: new Date("2026-11-03T00:00:00.000Z"),
};

describe("PlayRepository.ranking", () => {
  it("기간 안의 이용 횟수로 순위를 매기고, 같으면 이름순이다", async () => {
    const ranking = await setup().ranking(["a", "b"], range);
    expect(ranking.map((r) => [r.rank, r.game.name, r.playCount])).toEqual([
      [1, "딕싯", 4],
      [2, "카탄", 2],
      [3, "아줄", 1],
    ]);
  });

  it("매장 범위를 좁힐 수 있다", async () => {
    const ranking = await setup().ranking(["a"], range);
    expect(ranking.map((r) => [r.game.name, r.playCount])).toEqual([
      ["카탄", 2],
      ["딕싯", 1],
      ["아줄", 1],
    ]);
  });

  it("limit만큼만 돌려주고, 기록이 없으면 빈 순위다", async () => {
    expect(await setup().ranking(["a", "b"], range, 1)).toHaveLength(1);
    expect(await setup().ranking(["nope"], range)).toEqual([]);
  });
});

describe("createSeedPlays", () => {
  const now = new Date("2026-11-03T09:00:00.000Z");

  it("매번 같은 결과를 만들고, 보유(폐기 제외) 게임만 최근 60일 안에서 이용된다", () => {
    const db = createMockDb({}, now);
    expect(createSeedPlays(db.cafes, db.games, db.inventory, now)).toEqual(db.plays);

    const usable = new Set(
      db.inventory
        .filter((i) => i.status !== "retired")
        .map((i) => `${i.cafeId}:${i.gameId}`),
    );
    const oldest = new Date(now.getTime() - 61 * 86_400_000).toISOString();
    const games = new Map(db.games.map((g) => [g.id, g]));
    for (const p of db.plays) {
      expect(usable.has(`${p.cafeId}:${p.gameId}`)).toBe(true);
      expect(p.startedAt >= oldest).toBe(true);
      // 지난 기록은 now 전에 반납했고, 인원은 게임이 허용하는 범위다.
      if (p.returnedAt) expect(p.returnedAt <= now.toISOString()).toBe(true);
      const game = games.get(p.gameId)!;
      expect(p.playerCount).toBeGreaterThanOrEqual(game.minPlayers);
      expect(p.playerCount).toBeLessThanOrEqual(game.maxPlayers);
    }
    expect(new Set(db.plays.map((p) => p.id)).size).toBe(db.plays.length);
  });

  it("주간 1~10위와 월간 1~10위가 채워지고, 둘이 똑같지는 않다", async () => {
    const db = createMockDb({}, now);
    const repo = createPlayRepository(db);
    const ids = db.cafes.map((c) => c.id);
    const day = 86_400_000;
    const week = await repo.ranking(ids, { from: new Date(now.getTime() - 7 * day), to: now });
    const month = await repo.ranking(ids, { from: new Date(now.getTime() - 30 * day), to: now });

    expect(week).toHaveLength(10);
    expect(month).toHaveLength(10);
    expect(week.map((r) => r.game.id)).not.toEqual(month.map((r) => r.game.id));
    // 매장 하나만 봐도 10위까지 찬다.
    const single = await repo.ranking([ids[0]], { from: new Date(now.getTime() - 7 * day), to: now });
    expect(single).toHaveLength(10);
  });
});

describe("createSeedPlays: 이용 중", () => {
  const now = new Date("2026-11-03T09:00:00.000Z");

  it("매장마다 3~5개가 이용 중이고, 모두 이용 가능 상태인 게임의 박스 수 안이다", () => {
    const db = createMockDb({}, now);
    for (const cafe of db.cafes) {
      const active = db.plays.filter((p) => p.cafeId === cafe.id && !p.returnedAt);
      expect(active.length).toBeGreaterThanOrEqual(3);
      expect(active.length).toBeLessThanOrEqual(5);
      for (const p of active) {
        const item = db.inventory.find((i) => i.cafeId === cafe.id && i.gameId === p.gameId)!;
        expect(item.status).toBe("available");
        expect(active.filter((a) => a.gameId === p.gameId).length).toBeLessThanOrEqual(item.quantity);
        expect(p.startedAt < now.toISOString()).toBe(true);
      }
    }
  });
});

describe("PlayRepository: 대여·반납", () => {
  const cafe = (id: string, status: "open" | "closed" = "open") => ({
    id,
    name: id,
    region: "",
    openedAt: "",
    status,
  });
  const item = (cafeId: string, gameId: string, quantity: number, status = "available" as const) => ({
    cafeId,
    gameId,
    quantity,
    status,
    updatedAt: "",
  });

  function rentalSetup() {
    const db = createMockDb({
      cafes: [cafe("a"), cafe("z", "closed")],
      games: [game("g1", "카탄"), game("g2", "아줄"), game("g3", "딕싯")],
      inventory: [
        item("a", "g1", 2),
        item("a", "g2", 1),
        { ...item("a", "g3", 3), status: "maintenance" },
        item("z", "g1", 1),
      ],
      plays: [],
      users: [],
    });
    return { db, repo: createPlayRepository(db) };
  }

  it("빌려줄 수 있는 게임: 이용 가능 상태이고 남은 박스가 있는 게임", async () => {
    const { repo } = rentalSetup();
    expect((await repo.listRentable("a")).map((r) => [r.game.name, r.available])).toEqual([
      ["아줄", 1],
      ["카탄", 2],
    ]);
    await repo.start("a", { gameId: "g2", playerCount: 2 });
    expect((await repo.listRentable("a")).map((r) => r.game.id)).toEqual(["g1"]);
  });

  it("남은 박스가 없거나 점검 중이거나 폐점 매장이면 시작할 수 없다", async () => {
    const { repo } = rentalSetup();
    const started = await repo.start("a", { gameId: "g1", playerCount: 4, table: "3번" });
    expect(started).toMatchObject({ cafeId: "a", gameId: "g1", playerCount: 4, table: "3번" });
    expect(typeof started !== "string" && started.returnedAt).toBeUndefined();
    await repo.start("a", { gameId: "g1", playerCount: 2 });
    expect(await repo.start("a", { gameId: "g1", playerCount: 2 })).toBe("unavailable");
    expect(await repo.start("a", { gameId: "g3", playerCount: 2 })).toBe("unavailable");
    expect(await repo.start("z", { gameId: "g1", playerCount: 2 })).toBe("closed");
    expect(await repo.start("a", { gameId: "nope", playerCount: 2 })).toBe("not-found");
  });

  it("반납하면 이용 중에서 빠져 지난 기록에 들어가고, 박스를 다시 빌려줄 수 있다", async () => {
    const { repo } = rentalSetup();
    const started = await repo.start("a", { gameId: "g2", playerCount: 2 });
    if (typeof started === "string") throw new Error(started);
    expect((await repo.listActive("a")).map((p) => p.id)).toEqual([started.id]);

    const returned = await repo.return("a", started.id);
    expect(returned?.returnedAt).toBeDefined();
    expect(await repo.return("a", started.id)).toBeNull(); // 이미 반납
    expect(await repo.listActive("a")).toEqual([]);
    expect((await repo.listHistory("a")).items.map((p) => p.id)).toEqual([started.id]);
    expect((await repo.listRentable("a")).map((r) => r.game.id)).toContain("g2");
  });

  it("다른 매장의 기록은 반납·취소할 수 없고, 취소하면 기록이 사라진다", async () => {
    const { db, repo } = rentalSetup();
    const started = await repo.start("a", { gameId: "g1", playerCount: 2 });
    if (typeof started === "string") throw new Error(started);
    expect(await repo.return("z", started.id)).toBeNull();
    expect(await repo.cancel("z", started.id)).toBe(false);
    expect(await repo.cancel("a", started.id)).toBe(true);
    expect(db.plays).toEqual([]);
  });

  it("지난 기록은 최근 시작 순이고, 게임 이름과 날짜(한국 시간)로 거른다", async () => {
    const { db, repo } = rentalSetup();
    db.plays.push(
      play("a", "g1", "2026-11-01T14:59:00.000Z"), // 한국 11월 1일 23:59
      play("a", "g2", "2026-11-01T15:00:00.000Z"), // 한국 11월 2일 00:00
      play("a", "g1", "2026-11-02T05:00:00.000Z"),
      play("a", "g1", "2026-11-02T06:00:00.000Z", { returnedAt: undefined }), // 이용 중
    );
    const history = await repo.listHistory("a");
    expect(history.items.map((p) => p.startedAt)).toEqual([
      "2026-11-02T05:00:00.000Z",
      "2026-11-01T15:00:00.000Z",
      "2026-11-01T14:59:00.000Z",
    ]);
    expect((await repo.listHistory("a", { date: "2026-11-02" })).total).toBe(2);
    expect((await repo.listHistory("a", { date: "2026-11-01" })).total).toBe(1);
    expect((await repo.listHistory("a", { q: "아줄" })).total).toBe(1);
    expect((await repo.listHistory("a", {}, { offset: 1, limit: 1 })).items).toHaveLength(1);
  });

  it("인기 순위는 이용 중인 기록도 시작 시각으로 센다", async () => {
    const { db, repo } = rentalSetup();
    db.plays.push(play("a", "g2", "2026-11-02T06:00:00.000Z", { returnedAt: undefined }));
    expect((await repo.ranking(["a"], range)).map((r) => r.game.id)).toEqual(["g2"]);
  });
});

describe("PlayRepository.usage", () => {
  it("지금 이용 중, 오늘(한국 시간), 최근 7일 이용 시작 횟수를 매장별·전체로 센다", async () => {
    const db = createMockDb({
      cafes: [],
      games: [game("g1", "카탄")],
      inventory: [],
      users: [],
      plays: [
        play("a", "g1", "2026-11-03T01:00:00.000Z", { returnedAt: undefined }), // 오늘 10시, 이용 중
        play("a", "g1", "2026-11-02T15:30:00.000Z"), // 오늘 0시 30분
        play("a", "g1", "2026-11-02T14:00:00.000Z"), // 어제 23시
        play("b", "g1", "2026-10-30T10:00:00.000Z"), // 이번 주
        play("b", "g1", "2026-10-20T10:00:00.000Z"), // 7일 전보다 전
        play("c", "g1", "2026-11-03T01:00:00.000Z"), // 범위 밖 매장
      ],
    });
    const usage = await createPlayRepository(db).usage(
      ["a", "b"],
      new Date("2026-11-03T03:00:00.000Z"), // 한국 12시
    );
    expect(usage.cafes).toEqual([
      { cafeId: "a", inUse: 1, today: 2, week: 3 },
      { cafeId: "b", inUse: 0, today: 0, week: 1 },
    ]);
    expect(usage.totals).toEqual({ inUse: 1, today: 2, week: 4 });
  });
});
