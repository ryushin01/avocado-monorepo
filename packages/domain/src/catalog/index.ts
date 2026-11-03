import data from "../../data/catalog.json";
import type { CatalogData, CatalogGame, GameCategory } from "./types";

export * from "./types";

// catalog.json은 scripts/import-avocado.mjs로 생성한다.
const catalog = data as CatalogData;

/** 카탈로그 전체 게임 (BoardGameGeek 순위순) */
export const CATALOG_GAMES: readonly CatalogGame[] = catalog.games;

/** 유형 소개 (GAME_CATEGORIES 순서) */
export const CATEGORY_INFO = catalog.categories;

export function findCatalogGame(bggId: number) {
  return CATALOG_GAMES.find((g) => g.bggId === bggId);
}

export function catalogGamesIn(category: GameCategory) {
  return CATALOG_GAMES.filter((g) => g.categories.includes(category));
}
