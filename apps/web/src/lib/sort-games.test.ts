import { CATALOG_GAMES } from "@avocado/domain/catalog";
import { describe, expect, it } from "vitest";

import { parseGameSort, sortGames } from "./sort-games";

describe("sortGames", () => {
  it("랭킹·최신·평점·난이도 순으로 정렬하고 원본은 그대로 둔다", () => {
    const before = CATALOG_GAMES.map((g) => g.bggId);
    const recent = sortGames(CATALOG_GAMES, "recent");
    expect(recent[0].yearReleased).toBe(Math.max(...CATALOG_GAMES.map((g) => g.yearReleased)));
    expect(sortGames(CATALOG_GAMES, "rating")[0].rating).toBe(
      Math.max(...CATALOG_GAMES.map((g) => g.rating)),
    );
    expect(sortGames(CATALOG_GAMES, "weight").at(-1)!.weight).toBe(
      Math.min(...CATALOG_GAMES.map((g) => g.weight)),
    );
    expect(CATALOG_GAMES.map((g) => g.bggId)).toEqual(before);
  });

  it("알 수 없는 정렬은 랭킹순이다", () => {
    expect(parseGameSort("nope")).toBe("ranking");
    expect(parseGameSort(["rating"])).toBe("rating");
  });
});
