import type { KioskCafeGames } from "@avocado/domain/kiosk";

import { getDb } from "@/db/server";
import { kioskError, kioskJson, rejectUnauthorizedKiosk } from "@/server/kiosk/auth";
import { listKioskInventory } from "@/server/kiosk/games";
import { findOpenCafe } from "@/server/kiosk/open-cafe";
import { toKioskGames } from "@/server/kiosk/to-kiosk-games";

/**
 * 가맹점 런처(손님용 키오스크)가 매장 보유 게임과 지금 빌릴 수 있는지를 읽는다.
 * 운영 중인 매장만 응답하고, 없거나 폐점한 매장은 404. 토큰 확인은 server/kiosk/auth.ts
 * 키오스크가 자주 부르므로 DB에는 두 번에 나눠 다녀온다: 기기 확인과 매장 조회를 함께, 그다음 게임 목록 한 번.
 * 거절 순서(401·403 → 404)는 따로 읽을 때와 같다.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/games">) {
  const { cafeId } = await ctx.params;
  const [denied, cafe] = await Promise.all([rejectUnauthorizedKiosk(request, cafeId), findOpenCafe(cafeId)]);
  if (denied) return denied;
  if (!cafe) return kioskError(404, "운영 중인 매장이 아닙니다.");
  const items = await listKioskInventory(await getDb(), cafe.id);
  const body: KioskCafeGames = {
    cafe: { id: cafe.id, name: cafe.name },
    games: toKioskGames(items, new URL(request.url).origin),
    generatedAt: new Date().toISOString(),
  };
  return kioskJson(body);
}
