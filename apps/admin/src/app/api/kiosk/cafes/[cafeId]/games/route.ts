import type { KioskCafeGames } from "@avocado/domain/kiosk";

import { listInventory } from "@/lib/inventory/data";
import { kioskError, kioskJson, rejectUnauthorizedKiosk } from "@/lib/kiosk/auth";
import { findOpenCafe } from "@/lib/kiosk/open-cafe";
import { toKioskGames } from "@/lib/kiosk/to-kiosk-games";

/**
 * 가맹점 런처(손님용 키오스크)가 매장 보유 게임과 지금 빌릴 수 있는지를 읽는다.
 * 운영 중인 매장만 응답하고, 없거나 폐점한 매장은 404. 토큰 확인은 lib/kiosk/auth.ts
 */
export async function GET(request: Request, ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/games">) {
  const denied = rejectUnauthorizedKiosk(request);
  if (denied) return denied;
  const { cafeId } = await ctx.params;
  const cafe = await findOpenCafe(cafeId);
  if (!cafe) return kioskError(404, "운영 중인 매장이 아닙니다.");
  const { items } = await listInventory(cafe.id);
  const body: KioskCafeGames = {
    cafe: { id: cafe.id, name: cafe.name },
    games: toKioskGames(items, new URL(request.url).origin),
    generatedAt: new Date().toISOString(),
  };
  return kioskJson(body);
}
