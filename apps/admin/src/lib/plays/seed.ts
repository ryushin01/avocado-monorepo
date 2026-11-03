import type { Cafe } from "@/lib/cafes/types";
import type { BoardGame } from "@/lib/games/types";
import { hash01 } from "@/lib/hash";
import type { InventoryItem } from "@/lib/inventory/types";

import { DAY, startOfKstDay } from "./time";
import type { PlaySession } from "./types";

const MINUTE = 60_000;

/**
 * 최근 days일 동안의 이용 기록을 매번 같게 만든다(now 기준).
 *
 * - 매장이 보유한(폐기 제외) 게임만 이용된다.
 * - 게임마다 인기도가 다르다: 카탈로그 순서(BGG 순위)가 앞일수록, 그리고 게임·매장별 고정
 *   난수가 클수록 자주 이용된다.
 * - 인기도는 날마다 조금씩 오르내려서(유행) 주간 순위와 월간 순위가 달라진다.
 * - 주말에는 이용이 더 많다. 이용 시작은 한국 시간 12시~23시 사이다.
 * - 지난 기록은 모두 반납돼 있다. 반납 시각이 now 이후가 되는 기록은 만들지 않는다.
 * - 매장마다 지금 이용 중인 기록이 몇 개 있다(이용 가능 상태인 게임, 게임당 한 박스).
 */
export function createSeedPlays(
  cafes: Cafe[],
  games: BoardGame[],
  inventory: InventoryItem[],
  now = new Date(),
  days = 60,
): PlaySession[] {
  const gameIndex = new Map(games.map((g, i) => [g.id, i]));
  const gameById = new Map(games.map((g) => [g.id, g]));
  const nowTime = now.getTime();
  const today = startOfKstDay(nowTime);
  const plays: PlaySession[] = [];
  const nextId = () => `p_${plays.length + 1}`;

  const playerCount = (game: BoardGame, key: string) => {
    const max = Math.min(game.maxPlayers, Math.max(game.minPlayers, 6));
    return game.minPlayers + Math.floor(hash01(key) * (max - game.minPlayers + 1));
  };
  const table = (key: string) => `${1 + Math.floor(hash01(key) * 12)}번`;

  for (const cafe of cafes) {
    const owned = inventory.filter(
      (i) => i.cafeId === cafe.id && i.status !== "retired" && gameIndex.has(i.gameId),
    );
    if (owned.length === 0) continue;

    const base = owned.map((item) => {
      const index = gameIndex.get(item.gameId)!;
      const global = 0.3 + hash01(`pop:${item.gameId}`);
      const local = 0.6 + 0.8 * hash01(`pop:${cafe.id}:${item.gameId}`);
      return {
        gameId: item.gameId,
        weight: (global * local) / (1 + index / 15),
        phase: hash01(`trend:${item.gameId}`) * Math.PI * 2,
      };
    });

    for (let d = 0; d < days; d++) {
      const dayStart = today - d * DAY;
      // 한국 날짜의 요일
      const weekday = new Date(dayStart + 9 * 3_600_000).getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      const count = Math.round(
        (10 + hash01(`${cafe.id}:${d}:n`) * 10) * (weekend ? 1.6 : 1),
      );

      // 그날의 가중치 (유행에 따라 0.3배~1.7배)
      const weights = base.map((b) => b.weight * (1 + 0.7 * Math.sin(d / 8 + b.phase)));
      const total = weights.reduce((sum, w) => sum + w, 0);

      for (let s = 0; s < count; s++) {
        const key = `${cafe.id}:${d}:${s}`;
        let r = hash01(key) * total;
        let pick = 0;
        while (pick < weights.length - 1 && r >= weights[pick]) {
          r -= weights[pick];
          pick++;
        }
        const game = gameById.get(base[pick].gameId)!;
        // 12시~23시 사이에 시작해서, 게임의 플레이 시간 범위 안에서 반납한다.
        const start =
          dayStart + (12 * 60 + Math.floor(hash01(`${key}:t`) * 11 * 60)) * MINUTE;
        const duration =
          game.playTimeMin +
          Math.floor(hash01(`${key}:d`) * (game.playTimeMax - game.playTimeMin + 1));
        const end = start + Math.min(duration, 240) * MINUTE;
        if (end > nowTime) continue;
        plays.push({
          id: nextId(),
          cafeId: cafe.id,
          gameId: game.id,
          startedAt: new Date(start).toISOString(),
          returnedAt: new Date(end).toISOString(),
          playerCount: playerCount(game, `${key}:p`),
          table: table(`${key}:table`),
        });
      }
    }

    // 지금 이용 중: 이용 가능한 게임 중 3~5개, 최근 2시간 반 안에 시작
    const available = owned
      .filter((i) => i.status === "available")
      .sort((a, b) => hash01(`active:${cafe.id}:${a.gameId}`) - hash01(`active:${cafe.id}:${b.gameId}`));
    const activeCount = 3 + Math.floor(hash01(`active:${cafe.id}`) * 3);
    for (const item of available.slice(0, activeCount)) {
      const key = `active:${cafe.id}:${item.gameId}`;
      const game = gameById.get(item.gameId)!;
      plays.push({
        id: nextId(),
        cafeId: cafe.id,
        gameId: item.gameId,
        startedAt: new Date(nowTime - (10 + Math.floor(hash01(`${key}:t`) * 140)) * MINUTE).toISOString(),
        playerCount: playerCount(game, `${key}:p`),
        table: table(`${key}:table`),
      });
    }
  }
  return plays;
}
