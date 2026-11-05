import { phoneLast4 } from "@/lib/guests/contact";
import type { MockDb } from "@/lib/mock-db";
import { kstDayRange, toKstDate } from "@/lib/plays/time";

import type { ReservationInput } from "./schema";
import { OPEN_RESERVATION_STATUSES, type Reservation, type ReservationStatus } from "./types";

/**
 * - not-found: 그 매장에 없는 예약
 * - closed-cafe: 폐점 매장
 * - past: 지난 시각으로 등록·변경
 * - finished: 이미 입장·취소·노쇼로 끝난 예약
 * - invalid-transition: 그 상태로 바꿀 수 없음 (예: 확정 → 가예약)
 * - too-early: 예약 시각 전에 노쇼 처리
 */
export type ReservationError =
  | "not-found"
  | "closed-cafe"
  | "past"
  | "finished"
  | "invalid-transition"
  | "too-early";

/** 상태별로 바꿀 수 있는 다음 상태 */
const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending: ["confirmed", "seated", "cancelled", "no_show"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: [],
  cancelled: [],
  no_show: [],
};

export const canChangeReservation = (from: ReservationStatus, to: ReservationStatus) =>
  TRANSITIONS[from].includes(to);

const isOpen = (r: Reservation) => OPEN_RESERVATION_STATUSES.includes(r.status);
const byStart = (a: Reservation, b: Reservation) => a.startsAt.localeCompare(b.startsAt);

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. */
export interface ReservationRepository {
  /** date(한국 날짜) 하루의 예약, 시각순 */
  listByDate(cafeId: string, date: string): Promise<Reservation[]>;
  create(cafeId: string, input: ReservationInput, now: Date): Promise<Reservation | ReservationError>;
  /** 끝나지 않은 예약만 고칠 수 있다. 시각을 바꿀 때만 지난 시각인지 본다. */
  update(
    cafeId: string,
    id: string,
    input: ReservationInput,
    now: Date,
  ): Promise<Reservation | ReservationError>;
  setStatus(
    cafeId: string,
    id: string,
    status: ReservationStatus,
    now: Date,
  ): Promise<Reservation | ReservationError>;
  /** 키오스크: 오늘 아직 끝나지 않은 예약 중 전화번호 뒷자리가 같은 것 */
  findForKiosk(cafeId: string, last4: string, now: Date): Promise<Reservation[]>;
  /** 키오스크: 손님이 도착을 알린다. 뒷자리가 맞고 오늘 끝나지 않은 예약만 */
  checkIn(cafeId: string, id: string, last4: string, now: Date): Promise<Reservation | ReservationError>;
}

export function createReservationRepository(db: MockDb): ReservationRepository {
  const find = (cafeId: string, id: string) =>
    db.reservations.findIndex((r) => r.id === id && r.cafeId === cafeId);
  const cafeOpen = (cafeId: string) =>
    db.cafes.some((c) => c.id === cafeId && c.status === "open");
  const today = (now: Date) => toKstDate(now.getTime());
  const onDate = (r: Reservation, date: string) => {
    const { from, to } = kstDayRange(date);
    const t = Date.parse(r.startsAt);
    return t >= from && t < to;
  };

  return {
    async listByDate(cafeId, date) {
      return db.reservations
        .filter((r) => r.cafeId === cafeId && onDate(r, date))
        .sort(byStart)
        .map((r) => ({ ...r }));
    },

    async create(cafeId, input, now) {
      if (!cafeOpen(cafeId)) return "closed-cafe";
      if (Date.parse(input.startsAt) < now.getTime()) return "past";
      const reservation: Reservation = {
        ...input,
        id: `r_${db.nextReservationId++}`,
        cafeId,
        createdAt: now.toISOString(),
      };
      db.reservations.push(reservation);
      return { ...reservation };
    },

    async update(cafeId, id, input, now) {
      const index = find(cafeId, id);
      if (index === -1) return "not-found";
      const current = db.reservations[index];
      if (!isOpen(current)) return "finished";
      if (input.startsAt !== current.startsAt && Date.parse(input.startsAt) < now.getTime()) {
        return "past";
      }
      // 확정한 예약을 다시 가예약으로 되돌리지는 않는다.
      const status = current.status === "confirmed" ? "confirmed" : input.status;
      db.reservations[index] = { ...current, memo: undefined, ...input, status };
      return { ...db.reservations[index] };
    },

    async setStatus(cafeId, id, status, now) {
      const index = find(cafeId, id);
      if (index === -1) return "not-found";
      const current = db.reservations[index];
      if (!isOpen(current)) return "finished";
      if (!canChangeReservation(current.status, status)) return "invalid-transition";
      if (status === "no_show" && Date.parse(current.startsAt) > now.getTime()) return "too-early";
      db.reservations[index] = {
        ...current,
        status,
        closedAt: OPEN_RESERVATION_STATUSES.includes(status) ? undefined : now.toISOString(),
      };
      return { ...db.reservations[index] };
    },

    async findForKiosk(cafeId, last4, now) {
      const date = today(now);
      return db.reservations
        .filter(
          (r) =>
            r.cafeId === cafeId && isOpen(r) && onDate(r, date) && phoneLast4(r.phone) === last4,
        )
        .sort(byStart)
        .map((r) => ({ ...r }));
    },

    async checkIn(cafeId, id, last4, now) {
      const index = find(cafeId, id);
      if (index === -1) return "not-found";
      const current = db.reservations[index];
      if (phoneLast4(current.phone) !== last4 || !onDate(current, today(now))) return "not-found";
      if (!isOpen(current)) return "finished";
      db.reservations[index] = { ...current, arrivedAt: current.arrivedAt ?? now.toISOString() };
      return { ...db.reservations[index] };
    },
  };
}
