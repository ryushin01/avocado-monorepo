import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { KioskWaitlistJoinResult, KioskWaitlistStatus } from "@avocado/domain/kiosk";

import { kioskError, kioskJson, rejectUnauthorizedKiosk } from "@/lib/kiosk/auth";
import { findOpenCafe } from "@/lib/kiosk/open-cafe";
import { toKioskWaitlistEntry } from "@/lib/kiosk/to-kiosk-guest";
import { addToWaitlist, countActiveWaitlist, findWaitlistForKiosk } from "@/lib/reservations/data";
import { phoneLast4Schema } from "@/lib/reservations/schema";
import { waitlistInputSchema } from "@/lib/waitlist/schema";

/** 지금 대기 팀 수, phone4를 주면 내 대기 순서 */
export async function GET(request: Request, ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/waitlist">) {
  const { cafeId } = await ctx.params;
  const denied = await rejectUnauthorizedKiosk(request, cafeId);
  if (denied) return denied;
  const cafe = await findOpenCafe(cafeId);
  if (!cafe) return kioskError(404, "운영 중인 매장이 아닙니다.");

  const raw = new URL(request.url).searchParams.get("phone4");
  let mine: KioskWaitlistStatus["mine"] = [];
  if (raw !== null) {
    const phone4 = phoneLast4Schema.safeParse(raw);
    if (!phone4.success) return kioskError(400, phone4.error.issues[0].message);
    mine = (await findWaitlistForKiosk(cafe.id, phone4.data)).map(toKioskWaitlistEntry);
  }
  return kioskJson<KioskWaitlistStatus>({ waitingTeams: await countActiveWaitlist(cafe.id), mine });
}

/** 키오스크 '대기 등록' */
export async function POST(request: Request, ctx: RouteContext<"/api/kiosk/cafes/[cafeId]/waitlist">) {
  const { cafeId } = await ctx.params;
  const denied = await rejectUnauthorizedKiosk(request, cafeId);
  if (denied) return denied;
  const cafe = await findOpenCafe(cafeId);
  if (!cafe) return kioskError(404, "운영 중인 매장이 아닙니다.");

  const parsed = waitlistInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return kioskError(400, "입력을 확인해주세요.", z.flattenError(parsed.error).fieldErrors);
  }
  const result = await addToWaitlist(cafe.id, parsed.data);
  if (result === "duplicate") {
    return kioskError(409, "이 전화번호로 이미 대기 중입니다. '내 순서 확인'에서 확인해주세요.", {
      phone: ["이 전화번호로 이미 대기 중입니다."],
    });
  }
  if (typeof result === "string") return kioskError(404, "운영 중인 매장이 아닙니다.");

  revalidatePath("/reservations");
  return kioskJson<KioskWaitlistJoinResult>({ entry: toKioskWaitlistEntry(result) });
}
