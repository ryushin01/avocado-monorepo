import { and, count, eq, isNull, ne } from "drizzle-orm";

import type { Database } from "@/db/index";
import { games, inventoryItems, playSessions } from "@/db/schema";

import type { KioskInventoryRow } from "./to-kiosk-games";

/**
 * 키오스크 '보유 게임'용 매장 재고. 관리 화면 재고 목록(inventory/repository의 list)과 같은 값을 질의 하나로 읽는다.
 * - 폐기한 게임은 DB에서 빼고, 키오스크가 보여 주는 칸만 읽는다(게임 등록일·버전 등은 읽지 않음).
 * - 이용 중 수는 반납 전 이용 기록을 게임별로 세어 함께 붙인다(재고·이용 수를 따로 두 번 읽지 않음).
 * 정렬·변환은 toKioskGames가 한다.
 */
export async function listKioskInventory(db: Database, cafeId: string): Promise<KioskInventoryRow[]> {
  const open = db
    .select({ gameId: playSessions.gameId, n: count().as("n") })
    .from(playSessions)
    .where(and(eq(playSessions.cafeId, cafeId), isNull(playSessions.returnedAt)))
    .groupBy(playSessions.gameId)
    .as("open_sessions");
  const rows = await db
    .select({
      status: inventoryItems.status,
      quantity: inventoryItems.quantity,
      inUse: open.n,
      game: {
        id: games.id,
        name: games.name,
        englishName: games.englishName,
        thumbnailUrl: games.thumbnailUrl,
        imageUrl: games.imageUrl,
        categories: games.categories,
        minPlayers: games.minPlayers,
        maxPlayers: games.maxPlayers,
        playTimeMin: games.playTimeMin,
        playTimeMax: games.playTimeMax,
        difficulty: games.difficulty,
      },
    })
    .from(inventoryItems)
    .innerJoin(games, eq(games.id, inventoryItems.gameId))
    .leftJoin(open, eq(open.gameId, inventoryItems.gameId))
    .where(and(eq(inventoryItems.cafeId, cafeId), ne(inventoryItems.status, "retired")));
  return rows.map(({ inUse, game, ...item }) => ({
    ...item,
    inUse: Number(inUse ?? 0),
    game: {
      ...game,
      englishName: game.englishName ?? undefined,
      thumbnailUrl: game.thumbnailUrl ?? undefined,
      imageUrl: game.imageUrl ?? undefined,
    },
  }));
}
