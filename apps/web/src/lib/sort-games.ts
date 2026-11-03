import type { CatalogGame } from "@avocado/domain/catalog";

// 정렬 기준은 avocado 목록 화면의 정렬과 같다.
export const GAME_SORTS = ["ranking", "recent", "rating", "weight"] as const;
export type GameSort = (typeof GAME_SORTS)[number];

export const GAME_SORT_LABELS: Record<GameSort, string> = {
  ranking: "랭킹순",
  recent: "최신순",
  rating: "평점순",
  weight: "난이도순",
};

export function parseGameSort(value: string | string[] | undefined): GameSort {
  const v = Array.isArray(value) ? value[0] : value;
  return (GAME_SORTS as readonly string[]).includes(v ?? "") ? (v as GameSort) : "ranking";
}

/** 정렬한 새 배열. 값이 같으면 순위순 */
export function sortGames(games: readonly CatalogGame[], sort: GameSort): CatalogGame[] {
  const key: Record<GameSort, (g: CatalogGame) => number> = {
    ranking: (g) => g.rank,
    recent: (g) => -g.yearReleased,
    rating: (g) => -g.rating,
    weight: (g) => -g.weight,
  };
  return [...games].sort((a, b) => key[sort](a) - key[sort](b) || a.rank - b.rank);
}
