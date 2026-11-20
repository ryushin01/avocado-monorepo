import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { BookingError, BookingResult } from "@avocado/domain/booking";

import { listCafes } from "@/server/cafes/data";
import { bookOnline } from "@/server/reservations/data";
import type { BookingFailure } from "@/server/reservations/repository";
import { ONLINE_BOOKING } from "@/entities/reservation";
import { onlineBookingSchema } from "@/entities/reservation/index.server";

import { bookingError, bookingJson, rejectOverBookingLimit, rejectUnauthorizedBooking } from "../auth";
import { toBookingResult } from "../to-booking";

const TIME_TAKEN = "그 시각에는 빈 테이블이 없습니다. 다른 시각을 골라주세요.";
const NOT_BOOKABLE = "온라인으로 예약할 수 없는 시각입니다. 다른 시각을 골라주세요.";
const TOO_MANY = `온라인 예약은 ${ONLINE_BOOKING.maxPartySize}명까지 받습니다. 더 많으면 매장으로 전화해주세요.`;
const DUPLICATE = "이 휴대전화 번호로 그날 이 매장에 예약이 있습니다. 바꾸시려면 매장으로 전화해주세요.";

/** 저장소가 받지 않은 이유 → 상태 코드·오류 코드·문구(고칠 칸이 있으면 그 칸에도) */
const FAILURES: Record<BookingFailure, [number, BookingError["code"], string, BookingError["fieldErrors"]?]> = {
  "closed-cafe": [404, "closed", "온라인 예약을 받지 않는 매장입니다."],
  "outside-hours": [400, "invalid", NOT_BOOKABLE, { time: [NOT_BOOKABLE] }],
  "too-many": [400, "invalid", TOO_MANY, { partySize: [TOO_MANY] }],
  duplicate: [409, "duplicate", DUPLICATE, { phone: [DUPLICATE] }],
  full: [409, "full", TIME_TAKEN, { time: [TIME_TAKEN] }],
};

/** 손님 온라인 예약 등록. 빈 테이블을 자동으로 배정해 확정한다. */
export async function POST(request: Request, ctx: RouteContext<"/api/booking/cafes/[cafeId]/reservations">) {
  const { cafeId } = await ctx.params;
  const denied = rejectUnauthorizedBooking(request);
  if (denied) return denied;
  const limited = await rejectOverBookingLimit(request, "book");
  if (limited) return limited;

  const parsed = onlineBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return bookingError(400, "invalid", "입력을 확인해주세요.", z.flattenError(parsed.error).fieldErrors);
  }
  // 매장 이름은 저장 전에 읽는다. 저장한 뒤에 읽다 실패하면 예약은 됐는데 완료 응답을 잃는다.
  const cafe = (await listCafes()).find((c) => c.id === cafeId && c.status === "open");
  if (!cafe) return bookingError(...FAILURES["closed-cafe"]);
  const result = await bookOnline(cafeId, parsed.data);
  if (typeof result === "string") {
    const [status, code, message, fieldErrors] = FAILURES[result];
    return bookingError(status, code, message, fieldErrors);
  }

  // 카운터에 열어 둔 예약 화면은 자동 갱신(15초)으로 새 예약을 받는다.
  revalidatePath("/reservations");
  return bookingJson<BookingResult>(toBookingResult(result, cafe.name), 201);
}
