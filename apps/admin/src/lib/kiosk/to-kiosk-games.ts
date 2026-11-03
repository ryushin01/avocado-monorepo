import type { KioskGame } from "@avocado/domain/kiosk";

import { byGameName } from "@/lib/games/repository";
import type { InventoryEntry } from "@/lib/inventory/types";

/**
 * 매장 재고 → 키오스크에 보여줄 게임 목록. 폐기한 게임은 빼고 이름순으로 둔다.
 * origin: 썸네일을 절대 주소로 만들 백오피스 주소 (런처는 다른 주소에서 뜬다)
 */
export function toKioskGames(entries: InventoryEntry[], origin: string): KioskGame[] {
  return entries
    .filter((e) => e.status !== "retired")
    .sort((a, b) => byGameName(a.game, b.game))
    .map(({ game, status, quantity, inUse }) => {
      const availableCount = status === "available" ? Math.max(0, quantity - inUse) : 0;
      const image = game.thumbnailUrl ?? game.imageUrl;
      return {
        id: game.id,
        name: game.name,
        englishName: game.englishName,
        thumbnailUrl: image ? new URL(image, origin).toString() : undefined,
        categories: game.categories,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTimeMin: game.playTimeMin,
        playTimeMax: game.playTimeMax,
        difficulty: game.difficulty,
        availability:
          status === "maintenance" ? "unavailable" : availableCount > 0 ? "available" : "in-use",
        availableCount,
      };
    });
}
