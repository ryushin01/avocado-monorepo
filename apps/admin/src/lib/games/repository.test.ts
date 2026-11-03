import { describe, expect, it } from "vitest";

import { createMockDb } from "@/lib/mock-db";

import { createGameRepository } from "./repository";
import type { GameInput } from "./schema";

const input = (patch: Partial<GameInput> = {}): GameInput => ({
  name: "아그리콜라",
  englishName: "Agricola",
  categories: ["strategy"],
  difficulty: "hard",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMin: 30,
  playTimeMax: 150,
  ...patch,
});

describe("GameRepository (카탈로그)", () => {
  it("avocado 데이터 110개를 시드로 쓴다", async () => {
    const repo = createGameRepository(createMockDb());
    expect((await repo.list()).total).toBe(110);
  });

  it("한글·영문 이름(부분 일치), 카테고리(포함)로 필터하고 이름순 정렬한다", async () => {
    const repo = createGameRepository(createMockDb());

    expect((await repo.list({ q: "카탄" })).items.map((g) => g.name)).toEqual([
      "카탄: 도시와 기사",
    ]);
    expect((await repo.list({ q: "gloom" })).items.map((g) => g.name)).toEqual([
      "글룸헤이븐",
    ]);

    const { items: party } = await repo.list({ category: "party" });
    expect(party.length).toBeGreaterThan(0);
    expect(party.every((g) => g.categories.includes("party"))).toBe(true);
    const names = party.map((g) => g.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ko")));
  });

  it("range로 잘라 주고, total은 필터 적용 후 전체 개수다", async () => {
    const repo = createGameRepository(createMockDb());
    const all = (await repo.list({ category: "strategy" })).items;
    const page2 = await repo.list({ category: "strategy" }, { offset: 20, limit: 20 });
    expect(page2.total).toBe(all.length);
    expect(page2.items).toEqual(all.slice(20, 40));
  });

  it("매장 보유 현황(보유 매장 수·총 수량)을 함께 돌려주고, 폐점 매장은 뺀다", async () => {
    const db = createMockDb({
      cafes: [
        { id: "a", name: "A", region: "", openedAt: "", status: "open" },
        { id: "b", name: "B", region: "", openedAt: "", status: "open" },
        { id: "z", name: "Z", region: "", openedAt: "", status: "closed" },
      ],
      games: [],
      inventory: [],
    });
    const repo = createGameRepository(db);
    const owned = await repo.create(input({ name: "가" }));
    await repo.create(input({ name: "나" }));
    db.inventory.push(
      { cafeId: "a", gameId: owned.id, quantity: 2, status: "available", updatedAt: "" },
      { cafeId: "b", gameId: owned.id, quantity: 3, status: "retired", updatedAt: "" },
      { cafeId: "z", gameId: owned.id, quantity: 9, status: "available", updatedAt: "" },
    );

    const { items } = await repo.list();
    expect(items.map((g) => [g.name, g.holding])).toEqual([
      ["가", { cafeCount: 2, quantity: 5 }],
      ["나", { cafeCount: 0, quantity: 0 }],
    ]);
  });

  it("수정하면 등록일은 유지하고, 비운 선택 항목은 지운다", async () => {
    const repo = createGameRepository(createMockDb({ games: [], inventory: [] }));
    const created = await repo.create(input());
    const updated = await repo.update(
      created.id,
      input({ name: "아그리콜라 2판", englishName: undefined }),
    );
    expect(updated).toMatchObject({
      id: created.id,
      name: "아그리콜라 2판",
      createdAt: created.createdAt,
    });
    expect(updated?.englishName).toBeUndefined();
    expect(await repo.update("nope", input())).toBeNull();
  });

  it("시드 게임은 모두 로컬 썸네일이 있고, 원본 이미지를 바꾸면 썸네일을 지운다", async () => {
    const db = createMockDb();
    expect(db.games.every((g) => g.thumbnailUrl?.startsWith("/images/games/"))).toBe(true);

    const repo = createGameRepository(db);
    const game = db.games[0];
    const base = input({ name: game.name, imageUrl: game.imageUrl });
    expect((await repo.update(game.id, base))?.thumbnailUrl).toBe(game.thumbnailUrl);
    const changed = await repo.update(game.id, { ...base, imageUrl: "https://example.com/a.png" });
    expect(changed?.thumbnailUrl).toBeUndefined();
  });
});
