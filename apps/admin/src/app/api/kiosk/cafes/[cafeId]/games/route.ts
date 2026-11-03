import type { KioskCafeGames } from "@avocado/domain/kiosk";

import { listCafes } from "@/lib/cafes/data";
import { listInventory } from "@/lib/inventory/data";
import { toKioskGames } from "@/lib/kiosk/to-kiosk-games";

/**
 * 가맹점 런처(손님용 키오스크)가 매장 보유 게임과 지금 빌릴 수 있는지를 읽는다.
 * 운영 중인 매장만 응답하고, 없거나 폐점한 매장은 404.
 *
 * TODO: 인증이 정해지면 매장별 키오스크 토큰을 확인한다. 지금은 읽기 전용 정보만 준다.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/games">) {
  const { cafeId } = await ctx.params;
  const cafe = (await listCafes()).find((c) => c.id === cafeId && c.status === "open");
  if (!cafe) {
    return Response.json({ message: "운영 중인 매장이 아닙니다." }, { status: 404 });
  }
  const { items } = await listInventory(cafe.id);
  const body: KioskCafeGames = {
    cafe: { id: cafe.id, name: cafe.name },
    games: toKioskGames(items, new URL(request.url).origin),
    generatedAt: new Date().toISOString(),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
