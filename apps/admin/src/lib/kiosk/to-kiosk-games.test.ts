import { describe, expect, it } from "vitest";

import type { BoardGame } from "@/lib/games/types";
import type { InventoryEntry } from "@/lib/inventory/types";

import { toKioskGames } from "./to-kiosk-games";

const game = (id: string, name: string, patch: Partial<BoardGame> = {}): BoardGame => ({
  id,
  name,
  categories: ["family"],
  minPlayers: 2,
  maxPlayers: 4,
  playTimeMin: 30,
  playTimeMax: 60,
  difficulty: "easy",
  createdAt: "",
  ...patch,
});
const entry = (g: BoardGame, patch: Partial<InventoryEntry> = {}): InventoryEntry => ({
  cafeId: "a",
  gameId: g.id,
  quantity: 2,
  status: "available",
  updatedAt: "",
  inUse: 0,
  game: g,
  ...patch,
});

describe("toKioskGames", () => {
  it("폐기는 빼고 이름순이며, 남은 박스·점검 여부로 상태를 정한다", () => {
    const games = toKioskGames(
      [
        entry(game("g1", "카탄"), { inUse: 1 }),
        entry(game("g2", "아줄"), { inUse: 2 }),
        entry(game("g3", "딕싯"), { status: "maintenance" }),
        entry(game("g4", "가이아"), { status: "retired" }),
      ],
      "http://localhost:3000",
    );
    expect(games.map((g) => [g.name, g.availability, g.availableCount])).toEqual([
      ["딕싯", "unavailable", 0],
      ["아줄", "in-use", 0],
      ["카탄", "available", 1],
    ]);
  });

  it("썸네일은 백오피스 주소를 붙인 절대 주소다 (없으면 원본, 둘 다 없으면 비움)", () => {
    const [local, remote, none] = toKioskGames(
      [
        entry(game("g1", "가", { thumbnailUrl: "/images/games/1.webp", imageUrl: "https://x/1.jpg" })),
        entry(game("g2", "나", { imageUrl: "https://x/2.jpg" })),
        entry(game("g3", "다")),
      ],
      "http://localhost:3000",
    );
    expect(local.thumbnailUrl).toBe("http://localhost:3000/images/games/1.webp");
    expect(remote.thumbnailUrl).toBe("https://x/2.jpg");
    expect(none.thumbnailUrl).toBeUndefined();
  });
});
