import { describe, expect, it } from "vitest";

import { CATALOG_GAMES, CATEGORY_INFO, catalogGamesIn, GAME_CATEGORIES } from "./index";

describe("catalog", () => {
  it("avocado의 게임 110개를 순위순으로, 모두 로컬 썸네일과 함께 담는다", () => {
    expect(CATALOG_GAMES).toHaveLength(110);
    expect(CATALOG_GAMES.map((g) => g.rank)).toEqual(
      [...CATALOG_GAMES].map((g) => g.rank).sort((a, b) => a - b),
    );
    expect(CATALOG_GAMES.every((g) => g.thumbnailUrl === `/images/games/${g.bggId}.webp`)).toBe(true);
  });

  it("유형 소개는 7개 유형 순서와 같고, 모든 유형에 게임이 있다", () => {
    expect(CATEGORY_INFO.map((c) => c.key)).toEqual([...GAME_CATEGORIES]);
    for (const category of GAME_CATEGORIES) {
      expect(catalogGamesIn(category).length).toBeGreaterThan(0);
    }
  });
});
