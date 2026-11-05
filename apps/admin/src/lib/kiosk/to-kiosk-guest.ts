import type { KioskReservation, KioskWaitlistEntry } from "@avocado/domain/kiosk";

import { maskName } from "@/lib/guests/contact";
import type { Reservation } from "@/lib/reservations/types";
import type { WaitlistPosition } from "@/lib/waitlist/repository";

/** 키오스크로 보낼 예약. 이름은 가리고 전화번호는 빼고 보낸다. */
export const toKioskReservation = (r: Reservation): KioskReservation => ({
  id: r.id,
  maskedName: maskName(r.name),
  startsAt: r.startsAt,
  partySize: r.partySize,
  status: r.status === "pending" ? "pending" : "confirmed",
  arrived: Boolean(r.arrivedAt),
});

export const toKioskWaitlistEntry = (e: WaitlistPosition): KioskWaitlistEntry => ({
  id: e.id,
  number: e.number,
  maskedName: maskName(e.name),
  partySize: e.partySize,
  status: e.status === "called" ? "called" : "waiting",
  ahead: e.ahead,
});
