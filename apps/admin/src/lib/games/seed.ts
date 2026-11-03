import { CATALOG_GAMES, type CatalogGame } from "@avocado/domain/catalog";

import type { BoardGame } from "./types";

type Seed = Omit<BoardGame, "id" | "createdAt">;

/** 공통 카탈로그(avocado 변환 결과)에서 백오피스가 쓰는 항목만 고른다. */
const toSeed = (g: CatalogGame): Seed => ({
  bggId: g.bggId,
  name: g.name,
  englishName: g.englishName,
  imageUrl: g.imageUrl,
  thumbnailUrl: g.thumbnailUrl,
  categories: [...g.categories],
  minPlayers: g.minPlayers,
  maxPlayers: g.maxPlayers,
  playTimeMin: g.playTimeMin,
  playTimeMax: g.playTimeMax,
  difficulty: g.difficulty,
});

export function createSeedGames(seeds: Seed[] = CATALOG_GAMES.map(toSeed)): BoardGame[] {
  const base = Date.UTC(2026, 9, 1);
  return seeds.map((seed, i) => ({
    ...seed,
    id: `g_${i + 1}`,
    createdAt: new Date(base + i * 3_600_000).toISOString(),
  }));
}
