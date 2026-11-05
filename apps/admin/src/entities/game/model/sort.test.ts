import { describe, expect, it } from "vitest";

import { compareCatalog, nextGameSort } from "./sort";
import type { CatalogEntry } from "./types";

const game = (name: string, patch: Partial<CatalogEntry> = {}) =>
  ({
    name,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMin: 30,
    playTimeMax: 60,
    difficulty: "normal",
    holding: { cafeCount: 1, quantity: 1 },
    ...patch,
  }) as CatalogEntry;

const names = (list: CatalogEntry[]) => list.map((g) => g.name);

describe("compareCatalog", () => {
  it("기본은 이름 오름차순이다", () => {
    expect(names([game("다"), game("가"), game("나")].sort(compareCatalog()))).toEqual([
      "가",
      "나",
      "다",
    ]);
  });

  it("난이도는 글자순이 아니라 쉬움, 보통, 어려움 순이다", () => {
    const list = [
      game("어려움", { difficulty: "hard" }),
      game("쉬움", { difficulty: "easy" }),
      game("보통", { difficulty: "normal" }),
    ];
    expect(names(list.sort(compareCatalog("difficulty")))).toEqual(["쉬움", "보통", "어려움"]);
  });

  it("내림차순이어도 값이 같으면 이름 오름차순을 유지한다", () => {
    const list = [
      game("나", { holding: { cafeCount: 1, quantity: 3 } }),
      game("가", { holding: { cafeCount: 1, quantity: 3 } }),
      game("다", { holding: { cafeCount: 1, quantity: 9 } }),
    ];
    expect(names(list.sort(compareCatalog("holding", "desc")))).toEqual(["다", "가", "나"]);
  });
});

describe("nextGameSort", () => {
  it("다른 열을 누르면 그 열의 오름차순이 된다", () => {
    expect(nextGameSort("players", {})).toEqual({ sort: "players" });
  });

  it("오름차순 → 내림차순 → 기본 순서로 바뀐다", () => {
    expect(nextGameSort("players", { sort: "players" })).toEqual({ sort: "players", order: "desc" });
    expect(nextGameSort("players", { sort: "players", order: "desc" })).toEqual({});
  });

  it("기본 상태에서 이름을 누르면 내림차순이 된다", () => {
    expect(nextGameSort("name", {})).toEqual({ sort: "name", order: "desc" });
  });
});
