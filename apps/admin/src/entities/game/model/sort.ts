import { GAME_DIFFICULTIES } from "@avocado/domain/catalog";

import type { CatalogEntry } from "./types";

export const GAME_SORT_KEYS = ["name", "players", "playTime", "difficulty", "holding"] as const;
export type GameSortKey = (typeof GAME_SORT_KEYS)[number];

const byName = (a: CatalogEntry, b: CatalogEntry) => a.name.localeCompare(b.name, "ko");

const COMPARE: Record<GameSortKey, (a: CatalogEntry, b: CatalogEntry) => number> = {
  name: byName,
  players: (a, b) => a.minPlayers - b.minPlayers || a.maxPlayers - b.maxPlayers,
  playTime: (a, b) => a.playTimeMin - b.playTimeMin || a.playTimeMax - b.playTimeMax,
  difficulty: (a, b) =>
    GAME_DIFFICULTIES.indexOf(a.difficulty) - GAME_DIFFICULTIES.indexOf(b.difficulty),
  holding: (a, b) => a.holding.quantity - b.holding.quantity,
};

/** 카탈로그 정렬. 값이 같으면 항상 이름순이라 페이지를 넘겨도 순서가 흔들리지 않는다. */
export function compareCatalog(sort: GameSortKey = "name", order?: "desc") {
  const direction = order === "desc" ? -1 : 1;
  return (a: CatalogEntry, b: CatalogEntry) =>
    direction * COMPARE[sort](a, b) || byName(a, b);
}

/** 정렬 머리글을 눌렀을 때의 다음 상태: 오름차순 → 내림차순 → 기본(이름 오름차순) */
export function nextGameSort(
  key: GameSortKey,
  current: { sort?: GameSortKey; order?: "desc" },
): { sort?: GameSortKey; order?: "desc" } {
  if ((current.sort ?? "name") !== key) return { sort: key };
  return current.order === "desc" ? {} : { sort: key, order: "desc" };
}
