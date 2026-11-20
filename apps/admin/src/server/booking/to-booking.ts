import type { BookingCafe, BookingResult } from "@avocado/domain/booking";

import type { Cafe } from "@/entities/cafe";
import type { Reservation } from "@/entities/reservation";

/** 홍보 사이트에 보내는 매장. 내부 값(버전·개점일·상태)은 넣지 않는다. */
export const toBookingCafe = ({ id, name, region, address, phone }: Cafe): BookingCafe => ({
  id,
  name,
  region,
  ...(address ? { address } : {}),
  ...(phone ? { phone } : {}),
});

/** 예약 완료 응답. 손님의 이름·휴대전화는 다시 보내지 않는다. */
export const toBookingResult = (reservation: Reservation, cafeName: string): BookingResult => ({
  reservation: {
    id: reservation.id,
    cafeName,
    startsAt: reservation.startsAt,
    partySize: reservation.partySize,
    table: reservation.tableLabel ?? "",
  },
});
