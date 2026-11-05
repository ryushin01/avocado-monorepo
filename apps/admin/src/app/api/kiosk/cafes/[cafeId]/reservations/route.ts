import type { KioskReservationLookup } from "@avocado/domain/kiosk";

import { kioskError, kioskJson, rejectUnauthorizedKiosk } from "@/lib/kiosk/auth";
import { findOpenCafe } from "@/lib/kiosk/open-cafe";
import { toKioskReservation } from "@/lib/kiosk/to-kiosk-guest";
import { findReservationsForKiosk } from "@/lib/reservations/data";
import { phoneLast4Schema } from "@/lib/reservations/schema";

/** 키오스크 '예약 확인': 오늘 아직 끝나지 않은 예약 중 전화번호 뒷자리가 같은 것 */
export async function GET(request: Request, ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/reservations">) {
  const denied = rejectUnauthorizedKiosk(request);
  if (denied) return denied;
  const cafe = await findOpenCafe((await ctx.params).cafeId);
  if (!cafe) return kioskError(404, "운영 중인 매장이 아닙니다.");
  const phone4 = phoneLast4Schema.safeParse(new URL(request.url).searchParams.get("phone4"));
  if (!phone4.success) return kioskError(400, phone4.error.issues[0].message);

  const reservations = await findReservationsForKiosk(cafe.id, phone4.data);
  return kioskJson<KioskReservationLookup>({ reservations: reservations.map(toKioskReservation) });
}
