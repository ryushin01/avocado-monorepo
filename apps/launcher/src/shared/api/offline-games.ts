import { CATALOG_GAMES } from "@avocado/domain/catalog";
import type { KioskCafeGames } from "@avocado/domain/kiosk";

/**
 * 백오피스에 닿지 않을 때(오프라인·공개 데모 백오피스 장애) 보여 줄 게임 목록 스냅숏.
 * 함께 배포한 본사 카탈로그(@avocado/domain)와 썸네일(public/images/games)만 쓰므로 네트워크가 필요 없다.
 * 매장 재고·이용 현황은 알 수 없어 모두 '이용 가능'으로 두고, 화면은 이용 현황 대신 직원 문의 안내를 보여 준다.
 */
export function offlineCafeGames(cafeId: string, now = new Date()): KioskCafeGames {
  return {
    cafe: { id: cafeId || "offline", name: "매장" },
    games: [...CATALOG_GAMES]
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .map((game) => ({
        id: `bgg_${game.bggId}`,
        name: game.name,
        englishName: game.englishName,
        thumbnailUrl: game.thumbnailUrl,
        categories: game.categories,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTimeMin: game.playTimeMin,
        playTimeMax: game.playTimeMax,
        difficulty: game.difficulty,
        availability: "available",
        availableCount: 0,
      })),
    generatedAt: now.toISOString(),
  };
}
