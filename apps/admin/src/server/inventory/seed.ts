import type { Cafe } from "@/entities/cafe";
import type { BoardGame } from "@/entities/game";
import { hash01 } from "@/shared/lib/hash";

import type { InventoryItem, InventoryStatus } from "@/entities/inventory";

/**
 * 매장마다 카탈로그의 일부(약 55~75%)를 보유하도록 시드 재고를 만든다.
 * 수량·상태는 원본 데이터에 없으므로 매장·게임 조합으로 고정 생성한다.
 */
export function createSeedInventory(
  cafes: Cafe[],
  games: BoardGame[],
): InventoryItem[] {
  const base = Date.UTC(2026, 9, 1);
  return cafes.flatMap((cafe, cafeIndex) => {
    const ratio = 0.55 + (cafeIndex % 3) * 0.1;
    return games.flatMap((game): InventoryItem[] => {
      const key = `${cafe.id}:${game.id}`;
      if (hash01(key) >= ratio) return [];
      const roll = hash01(`${key}:status`);
      const status: InventoryStatus =
        roll < 0.04 ? "retired" : roll < 0.14 ? "maintenance" : "available";
      return [
        {
          cafeId: cafe.id,
          gameId: game.id,
          quantity: 1 + Math.floor(hash01(`${key}:qty`) * 3),
          status,
          updatedAt: new Date(
            base + Math.floor(hash01(`${key}:at`) * 30 * 86_400_000),
          ).toISOString(),
        },
      ];
    });
  });
}
