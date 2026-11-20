import type { BookingOptions } from "@avocado/domain/booking";

import { listCafes } from "@/server/cafes/data";
import { bookableDates, ONLINE_BOOKING } from "@/entities/reservation";

import { bookingJson, rejectOverBookingLimit, rejectUnauthorizedBooking } from "../auth";
import { toBookingCafe } from "../to-booking";

/** 예약 화면의 선택지: 운영 중인 매장, 받는 날짜, 온라인으로 받는 최대 인원 */
export async function GET(request: Request) {
  const denied = rejectUnauthorizedBooking(request);
  if (denied) return denied;
  const limited = await rejectOverBookingLimit(request, "read");
  if (limited) return limited;

  const cafes = (await listCafes()).filter((cafe) => cafe.status === "open").map(toBookingCafe);
  return bookingJson<BookingOptions>({
    cafes,
    dates: bookableDates(new Date()),
    maxPartySize: ONLINE_BOOKING.maxPartySize,
  });
}
