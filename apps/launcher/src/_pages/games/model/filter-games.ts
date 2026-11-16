import { GAME_CATEGORIES, type GameCategory } from "@avocado/domain/catalog";
import type { KioskGame } from "@avocado/domain/kiosk";

export type KioskFilter = {
  /** 함께 할 인원. 8은 "8명 이상" */
  players?: number;
  category?: GameCategory;
  /** 지금 바로 빌릴 수 있는 게임만 */
  availableOnly?: boolean;
};

export const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 8] as const;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** URL 검색 파라미터 → 필터. 알 수 없는 값은 무시한다. */
export function parseKioskFilter(params: Record<string, string | string[] | undefined>): KioskFilter {
  const players = Number(first(params.players));
  const category = first(params.category);
  return {
    players: (PLAYER_OPTIONS as readonly number[]).includes(players) ? players : undefined,
    category: (GAME_CATEGORIES as readonly string[]).includes(category ?? "")
      ? (category as GameCategory)
      : undefined,
    availableOnly: first(params.available) === "1",
  };
}

/** 필터에 맞는 게임. 지금 빌릴 수 있는 게임을 먼저 보여준다(그 안에서는 받은 순서). */
export function filterKioskGames(games: KioskGame[], filter: KioskFilter) {
  const rank = { available: 0, "in-use": 1, unavailable: 2 } as const;
  return games
    .filter((g) => {
      if (filter.players !== undefined) {
        const fits =
          filter.players === 8
            ? g.maxPlayers >= 8
            : g.minPlayers <= filter.players && filter.players <= g.maxPlayers;
        if (!fits) return false;
      }
      if (filter.category && !g.categories.includes(filter.category)) return false;
      if (filter.availableOnly && g.availability !== "available") return false;
      return true;
    })
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank[a.g.availability] - rank[b.g.availability] || a.i - b.i)
    .map(({ g }) => g);
}

/** 필터를 바꾼 주소. 값이 없으면 파라미터를 뺀다. */
export function kioskFilterHref(filter: KioskFilter) {
  const search = new URLSearchParams();
  if (filter.players) search.set("players", String(filter.players));
  if (filter.category) search.set("category", filter.category);
  if (filter.availableOnly) search.set("available", "1");
  const query = search.toString();
  return query ? `/games?${query}` : "/games";
}
