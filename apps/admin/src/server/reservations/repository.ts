import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";

import type { Database } from "@/db/index";
import { newId } from "@/db/ids";
import { toReservation } from "@/db/mappers";
import { cafes, reservations } from "@/db/schema";
import { phoneLast4 } from "@/entities/guest";
import { kstDayRange, toKstDate } from "@/shared/lib/kst-time";

import { canChangeReservation, type ReservationInput } from "@/entities/reservation";
import {
  OPEN_RESERVATION_STATUSES,
  type Reservation,
  type ReservationStatus,
} from "@/entities/reservation";

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

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface ReservationRepository {
  /** date(한국 날짜) 하루의 예약, 시각순 */
  listByDate(cafeId: string, date: string): Promise<Reservation[]>;
  create(cafeId: string, input: ReservationInput, now: Date): Promise<Reservation | ReservationError>;
  /** 끝나지 않은 예약만 고칠 수 있다. 시각을 바꿀 때만 지난 시각인지 본다. */
  update(cafeId: string, id: string, input: ReservationInput, now: Date): Promise<Reservation | ReservationError>;
  setStatus(cafeId: string, id: string, status: ReservationStatus, now: Date): Promise<Reservation | ReservationError>;
  /** 키오스크: 오늘 아직 끝나지 않은 예약 중 전화번호 뒷자리가 같은 것 */
  findForKiosk(cafeId: string, last4: string, now: Date): Promise<Reservation[]>;
  /** 키오스크: 손님이 도착을 알린다. 뒷자리가 맞고 오늘 끝나지 않은 예약만 */
  checkIn(cafeId: string, id: string, last4: string, now: Date): Promise<Reservation | ReservationError>;
}

export function createReservationRepository(db: Database): ReservationRepository {
  const isOpen = (r: Reservation) => OPEN_RESERVATION_STATUSES.includes(r.status);
  const byId = (cafeId: string, id: string) => and(eq(reservations.id, id), eq(reservations.cafeId, cafeId));
  const find = async (cafeId: string, id: string) => {
    const [row] = await db.select().from(reservations).where(byId(cafeId, id));
    return row ? toReservation(row) : null;
  };
  const onDay = (cafeId: string, date: string) => {
    const { from, to } = kstDayRange(date);
    return and(
      eq(reservations.cafeId, cafeId),
      gte(reservations.startsAt, new Date(from)),
      lt(reservations.startsAt, new Date(to)),
    );
  };

  return {
    async listByDate(cafeId, date) {
      const rows = await db.select().from(reservations).where(onDay(cafeId, date)).orderBy(asc(reservations.startsAt));
      return rows.map(toReservation);
    },

    async create(cafeId, input, now) {
      const [cafe] = await db.select().from(cafes).where(and(eq(cafes.id, cafeId), eq(cafes.status, "open")));
      if (!cafe) return "closed-cafe";
      if (Date.parse(input.startsAt) < now.getTime()) return "past";
      const [row] = await db
        .insert(reservations)
        .values({
          ...input,
          id: newId("r"),
          cafeId,
          startsAt: new Date(input.startsAt),
          memo: input.memo ?? null,
          createdAt: now,
        })
        .returning();
      return toReservation(row);
    },

    async update(cafeId, id, input, now) {
      const current = await find(cafeId, id);
      if (!current) return "not-found";
      if (!isOpen(current)) return "finished";
      if (input.startsAt !== current.startsAt && Date.parse(input.startsAt) < now.getTime()) return "past";
      // 확정한 예약을 다시 가예약으로 되돌리지는 않는다.
      const status = current.status === "confirmed" ? "confirmed" : input.status;
      const [row] = await db
        .update(reservations)
        .set({ ...input, startsAt: new Date(input.startsAt), memo: input.memo ?? null, status })
        .where(byId(cafeId, id))
        .returning();
      return toReservation(row);
    },

    async setStatus(cafeId, id, status, now) {
      const current = await find(cafeId, id);
      if (!current) return "not-found";
      if (!isOpen(current)) return "finished";
      if (!canChangeReservation(current.status, status)) return "invalid-transition";
      if (status === "no_show" && Date.parse(current.startsAt) > now.getTime()) return "too-early";
      const [row] = await db
        .update(reservations)
        .set({ status, closedAt: OPEN_RESERVATION_STATUSES.includes(status) ? null : now })
        .where(byId(cafeId, id))
        .returning();
      return toReservation(row);
    },

    async findForKiosk(cafeId, last4, now) {
      const rows = await db
        .select()
        .from(reservations)
        .where(and(onDay(cafeId, toKstDate(now.getTime())), inArray(reservations.status, [...OPEN_RESERVATION_STATUSES])))
        .orderBy(asc(reservations.startsAt));
      return rows.map(toReservation).filter((r) => phoneLast4(r.phone) === last4);
    },

    async checkIn(cafeId, id, last4, now) {
      const current = await find(cafeId, id);
      const { from, to } = kstDayRange(toKstDate(now.getTime()));
      const t = current ? Date.parse(current.startsAt) : NaN;
      if (!current || phoneLast4(current.phone) !== last4 || !(t >= from && t < to)) return "not-found";
      if (!isOpen(current)) return "finished";
      if (current.arrivedAt) return current;
      const [row] = await db.update(reservations).set({ arrivedAt: now }).where(byId(cafeId, id)).returning();
      return toReservation(row);
    },
  };
}
