import type { KioskGame } from "@avocado/domain/kiosk";
import { describe, expect, it } from "vitest";

import { filterKioskGames, kioskFilterHref, parseKioskFilter } from "./filter-games";

const game = (id: string, patch: Partial<KioskGame> = {}): KioskGame => ({
  id,
  name: id,
  categories: ["family"],
  minPlayers: 2,
  maxPlayers: 4,
  playTimeMin: 30,
  playTimeMax: 60,
  difficulty: "easy",
  availability: "available",
  availableCount: 1,
  ...patch,
});

describe("kiosk filter", () => {
  it("인원·유형·이용 가능으로 거르고, 이용 가능한 게임을 먼저 둔다", () => {
    const games = [
      game("a", { availability: "in-use", availableCount: 0 }),
      game("b", { maxPlayers: 10, categories: ["party"] }),
      game("c", { minPlayers: 1, maxPlayers: 1 }),
      game("d", { availability: "unavailable", availableCount: 0 }),
      game("e"),
    ];
    expect(filterKioskGames(games, {}).map((g) => g.id)).toEqual(["b", "c", "e", "a", "d"]);
    expect(filterKioskGames(games, { players: 3 }).map((g) => g.id)).toEqual(["b", "e", "a", "d"]);
    expect(filterKioskGames(games, { players: 8 }).map((g) => g.id)).toEqual(["b"]);
    expect(filterKioskGames(games, { category: "party" }).map((g) => g.id)).toEqual(["b"]);
    expect(filterKioskGames(games, { availableOnly: true }).map((g) => g.id)).toEqual(["b", "c", "e"]);
  });

  it("주소 ↔ 필터: 알 수 없는 값은 무시하고, 빈 값은 주소에서 뺀다", () => {
    expect(parseKioskFilter({ players: "7", category: "nope", available: "1" })).toEqual({
      players: undefined,
      category: undefined,
      availableOnly: true,
    });
    expect(kioskFilterHref({ players: 4, category: "party" })).toBe("/games?players=4&category=party");
    expect(kioskFilterHref({})).toBe("/games");
  });
});
