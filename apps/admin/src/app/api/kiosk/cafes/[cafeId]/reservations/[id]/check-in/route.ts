import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { KioskCheckInResult } from "@avocado/domain/kiosk";

import { kioskError, kioskJson, rejectUnauthorizedKiosk } from "@/server/kiosk/auth";
import { findOpenCafe } from "@/server/kiosk/open-cafe";
import { toKioskReservation } from "@/server/kiosk/to-kiosk-guest";
import { checkInReservation } from "@/server/reservations/data";
import { phoneLast4Schema } from "@/entities/reservation/schema";

const bodySchema = z.object({ phone4: phoneLast4Schema });

/** 키오스크 '도착했어요': 뒷자리를 한 번 더 확인하고 도착 시각을 남긴다. 직원 화면에 '도착'으로 보인다. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/reservations/[id]/check-in">,
) {
  const { cafeId, id } = await ctx.params;
  const denied = await rejectUnauthorizedKiosk(request, cafeId);
  if (denied) return denied;
  const cafe = await findOpenCafe(cafeId);
  if (!cafe) return kioskError(404, "운영 중인 매장이 아닙니다.");
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return kioskError(400, "전화번호 뒷자리 4자리를 입력해주세요.");

  const result = await checkInReservation(cafe.id, id, body.data.phone4);
  if (result === "finished") return kioskError(409, "이미 입장했거나 취소된 예약입니다. 직원에게 문의해주세요.");
  if (typeof result === "string") return kioskError(404, "예약을 찾을 수 없습니다.");

  revalidatePath("/reservations");
  return kioskJson<KioskCheckInResult>({
    reservation: toKioskReservation(result),
  });
}
