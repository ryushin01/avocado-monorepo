import { z } from "zod";

import type { BookingAvailability } from "@avocado/domain/booking";

import { bookingAvailability } from "@/server/reservations/data";
import { bookingAvailabilityQuerySchema } from "@/entities/reservation/index.server";

import { bookingError, bookingJson, rejectOverBookingLimit, rejectUnauthorizedBooking } from "../auth";

/** 그날 받는 시각마다 일행이 앉을 빈 테이블이 있는지 (?date=YYYY-MM-DD&partySize=N) */
export async function GET(request: Request, ctx: RouteContext<"/api/booking/cafes/[cafeId]/availability">) {
  const { cafeId } = await ctx.params;
  const denied = rejectUnauthorizedBooking(request);
  if (denied) return denied;
  const limited = await rejectOverBookingLimit(request, "read");
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const parsed = bookingAvailabilityQuerySchema.safeParse({
    date: params.get("date") ?? undefined,
    partySize: params.get("partySize") ?? undefined,
  });
  if (!parsed.success) {
    return bookingError(400, "invalid", "날짜와 인원을 확인해주세요.", z.flattenError(parsed.error).fieldErrors);
  }
  const { date, partySize } = parsed.data;
  const result = await bookingAvailability(cafeId, date, partySize);
  if (!result) return bookingError(404, "closed", "온라인 예약을 받지 않는 매장입니다.");
  return bookingJson<BookingAvailability>({
    cafe: { id: result.cafe.id, name: result.cafe.name },
    date,
    partySize,
    slots: result.slots,
  });
}
