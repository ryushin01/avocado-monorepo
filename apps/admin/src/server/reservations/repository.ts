import { addMinutes } from "date-fns/addMinutes";
import { isSameDay } from "date-fns/isSameDay";
import { subMinutes } from "date-fns/subMinutes";
import { and, asc, eq, getTableColumns, gt, gte, inArray, isNotNull, lt, ne } from "drizzle-orm";

import type { Database } from "@/db/index";
import { newId } from "@/db/ids";
import { toCafe, toCafeTable, toReservation } from "@/db/mappers";
import { cafeTables, cafes, reservations } from "@/db/schema";
import { nextVersion } from "@/db/version";
import { phoneLast4 } from "@/entities/guest";
import { inKst, kstDayRange, toKstDate } from "@/shared/lib/kst-time";
import { omit } from "@/shared/lib/omit";

import {
  canChangeReservation,
  isBookableTime,
  kstStartsAt,
  ONLINE_BOOKING,
  onlineBookingTimes,
  pickTable,
  RESERVATION_MINUTES,
  seatProblem,
  SEATING_RESERVATION_STATUSES,
  type OnlineBookingInput,
  type ReservationInput,
  type TakenSeat,
} from "@/entities/reservation";
import {
  OPEN_RESERVATION_STATUSES,
  type Reservation,
  type ReservationStatus,
} from "@/entities/reservation";
import type { Cafe } from "@/entities/cafe";

/**
 * - not-found: 그 매장에 없는 예약
 * - closed-cafe: 폐점 매장
 * - past: 지난 시각으로 등록·변경
 * - finished: 이미 입장·취소·노쇼로 끝난 예약
 * - invalid-transition: 그 상태로 바꿀 수 없음 (예: 확정 → 가예약)
 * - too-early: 예약 시각 전에 노쇼 처리
 * - changed: 확인하는 사이, 또는 수정 폼을 연 뒤에 다른 직원이 먼저 바꿈 (다시 보고 처리)
 * - no-table: 자동 배정할 빈 테이블이 그 시각에 없음
 * - table-taken: 고른 테이블에 그 시각 앞뒤 2시간 안의 다른 예약이 있음
 * - table-too-small: 고른 테이블의 좌석이 인원보다 적음
 * - table-not-found: 그 매장에 없거나 쓰지 않는 테이블
 */
export type ReservationError =
  | "not-found"
  | "closed-cafe"
  | "past"
  | "finished"
  | "invalid-transition"
  | "too-early"
  | "changed"
  | "no-table"
  | "table-taken"
  | "table-too-small"
  | "table-not-found";

/**
 * 손님 온라인 예약이 안 되는 이유
 * - closed-cafe: 운영 중이 아닌 매장
 * - outside-hours: 받는 날짜·시각(ONLINE_BOOKING)이 아니거나 너무 임박함
 * - too-many: 온라인으로 받는 인원보다 많음
 * - duplicate: 같은 휴대전화로 그날 이 매장에 끝나지 않은 예약이 있음
 * - full: 그 시각에 일행이 앉을 빈 테이블이 없음
 */
export type BookingFailure = "closed-cafe" | "outside-hours" | "too-many" | "duplicate" | "full";

/** 온라인 예약 화면에 보여줄 하루의 시각별 빈자리 */
export type BookingAvailability = { cafe: Cafe; slots: { time: string; available: boolean }[] };

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface ReservationRepository {
  /** date(한국 날짜) 하루의 예약, 시각순 */
  listByDate(cafeId: string, date: string): Promise<Reservation[]>;
  create(cafeId: string, input: ReservationInput, now: Date): Promise<Reservation | ReservationError>;
  /**
   * 끝나지 않은 예약만 고칠 수 있다. 시각을 바꿀 때만 지난 시각인지 본다.
   * version: 수정 폼을 연 시점의 버전. 그사이 누가 고치거나 상태를 바꿨으면 덮어쓰지 않고 "changed".
   */
  update(cafeId: string, id: string, input: ReservationInput, version: number, now: Date): Promise<Reservation | ReservationError>;
  setStatus(cafeId: string, id: string, status: ReservationStatus, now: Date): Promise<Reservation | ReservationError>;
  /** 키오스크: 오늘 아직 끝나지 않은 예약 중 전화번호 뒷자리가 같은 것 */
  findForKiosk(cafeId: string, last4: string, now: Date): Promise<Reservation[]>;
  /** 키오스크: 손님이 도착을 알린다. 뒷자리가 맞고 오늘 끝나지 않은 예약만 */
  checkIn(cafeId: string, id: string, last4: string, now: Date): Promise<Reservation | ReservationError>;
  /** 손님 온라인 예약: 받는 날짜·시각·인원을 확인하고 빈 테이블을 자동으로 배정해 확정한다. */
  book(cafeId: string, input: OnlineBookingInput, now: Date): Promise<Reservation | BookingFailure>;
  /** 온라인 예약 화면: date(한국 날짜)의 받는 시각마다 일행이 앉을 빈 테이블이 있는지. 운영 중이 아닌 매장이면 null */
  availability(cafeId: string, date: string, partySize: number, now: Date): Promise<BookingAvailability | null>;
}

/** 그 시각 앞뒤로 예약 하나가 테이블을 쓰는 시간만큼 넓힌 범위 [시작, 끝] (ms) */
const seatingWindow = (from: number, to: number = from) => ({
  from: subMinutes(from, RESERVATION_MINUTES).getTime(),
  to: addMinutes(to, RESERVATION_MINUTES).getTime(),
});

export function createReservationRepository(db: Database): ReservationRepository {
  const isOpen = (r: Reservation) => OPEN_RESERVATION_STATUSES.includes(r.status);
  const byId = (cafeId: string, id: string) => and(eq(reservations.id, id), eq(reservations.cafeId, cafeId));
  /**
   * 읽은 뒤 상태와 예약 시각이 그대로일 때만 바꾼다. 두 직원이 동시에 바꾸면 나중 것이 앞의 변경을 덮지 않고,
   * 노쇼(예약 시각이 지나야 함)처럼 읽은 시각으로 판단한 변경이 그사이 바뀐 시각에 적용되지 않게 한다.
   */
  const unchanged = (r: Reservation) =>
    and(
      byId(r.cafeId, r.id),
      eq(reservations.status, r.status),
      eq(reservations.startsAt, new Date(r.startsAt)),
    );
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
  /** 예약과 배정 테이블 이름을 함께 읽는다. */
  const withTable = () =>
    db
      .select({ ...getTableColumns(reservations), tableLabel: cafeTables.label })
      .from(reservations)
      .leftJoin(cafeTables, eq(cafeTables.id, reservations.tableId));
  const toListed = ({ tableLabel, ...row }: typeof reservations.$inferSelect & { tableLabel: string | null }) =>
    toReservation(row, tableLabel);

  /**
   * 운영 중인 매장 줄을 잠근다. 테이블 배정과 등록을 같은 트랜잭션에서 하므로, 두 예약이 동시에 같은 테이블을 받지 않는다
   * (대기 번호 발급과 같은 방식). 운영 중이 아니면 null
   */
  const lockOpenCafe = async (q: Database, cafeId: string) => {
    const [cafe] = await q
      .select()
      .from(cafes)
      .where(and(eq(cafes.id, cafeId), eq(cafes.status, "open")))
      .for("update");
    return cafe ?? null;
  };
  /** 운영 여부와 관계없이 매장 줄을 잠근다(수정: 폐점한 매장의 지난 예약을 고칠 때도 테이블 배정이 겹치지 않게). */
  const lockCafe = (q: Database, cafeId: string) =>
    q.select({ id: cafes.id }).from(cafes).where(eq(cafes.id, cafeId)).for("update");

  /** from~to에 시작하는 예약 중 테이블을 차지한 것 (exceptId: 고치는 예약 자신은 뺀다) */
  const takenBetween = async (q: Database, cafeId: string, from: number, to: number, exceptId?: string): Promise<TakenSeat[]> =>
    (
      await q
        .select({ tableId: reservations.tableId, startsAt: reservations.startsAt })
        .from(reservations)
        .where(
          and(
            eq(reservations.cafeId, cafeId),
            isNotNull(reservations.tableId),
            inArray(reservations.status, [...SEATING_RESERVATION_STATUSES]),
            gt(reservations.startsAt, new Date(from)),
            lt(reservations.startsAt, new Date(to)),
            exceptId ? ne(reservations.id, exceptId) : undefined,
          ),
        )
    ).map((r) => ({ tableId: r.tableId!, startsAt: r.startsAt.toISOString() }));

  const labelOf = async (q: Database, tableId: string | null) => {
    if (!tableId) return null;
    const [row] = await q.select({ label: cafeTables.label }).from(cafeTables).where(eq(cafeTables.id, tableId));
    return row?.label ?? null;
  };

  const tablesOf = async (q: Database, cafeId: string) =>
    (await q.select().from(cafeTables).where(eq(cafeTables.cafeId, cafeId))).map(toCafeTable);

  /**
   * 폼의 테이블 선택(auto·none·테이블 id)을 그 시각·인원으로 확인해 배정할 테이블 id를 정한다.
   * keep: 이미 배정된 테이블. 쓰지 않게 됐어도 그대로 두는 것은 허락한다(지난 배정 유지).
   */
  async function chooseTable(
    q: Database,
    cafeId: string,
    choice: string,
    startsAt: string,
    partySize: number,
    { exceptId, keep }: { exceptId?: string; keep?: string } = {},
  ): Promise<{ tableId: string | null } | ReservationError> {
    if (choice === "none") return { tableId: null };
    const around = seatingWindow(Date.parse(startsAt));
    const [tables, taken] = await Promise.all([
      tablesOf(q, cafeId),
      takenBetween(q, cafeId, around.from, around.to, exceptId),
    ]);
    if (choice === "auto") {
      const table = pickTable(tables, taken, startsAt, partySize);
      return table ? { tableId: table.id } : "no-table";
    }
    const table = tables.find((candidate) => candidate.id === choice);
    if (!table) return "table-not-found";
    const problem = seatProblem(table.id === keep ? { ...table, active: true } : table, taken, startsAt, partySize);
    if (problem === "inactive") return "table-not-found";
    if (problem === "too-small") return "table-too-small";
    if (problem === "taken") return "table-taken";
    return { tableId: table.id };
  }

  return {
    async listByDate(cafeId, date) {
      const rows = await withTable().where(onDay(cafeId, date)).orderBy(asc(reservations.startsAt));
      return rows.map(toListed);
    },

    async create(cafeId, input, now) {
      if (Date.parse(input.startsAt) < now.getTime()) return "past";
      return db.transaction(async (tx) => {
        if (!(await lockOpenCafe(tx, cafeId))) return "closed-cafe" as const;
        const seat = await chooseTable(tx, cafeId, input.table, input.startsAt, input.partySize);
        if (typeof seat === "string") return seat;
        const [row] = await tx
          .insert(reservations)
          .values({
            ...omit(input, "table"),
            id: newId("r"),
            cafeId,
            startsAt: new Date(input.startsAt),
            memo: input.memo ?? null,
            createdAt: now,
            tableId: seat.tableId,
            source: "staff",
          })
          .returning();
        return toReservation(row, await labelOf(tx, seat.tableId));
      });
    },

    async update(cafeId, id, input, version, now) {
      return db.transaction(async (tx) => {
        await lockCafe(tx, cafeId);
        const [row] = await tx.select().from(reservations).where(byId(cafeId, id));
        const current = row ? toReservation(row) : null;
        if (!current) return "not-found" as const;
        if (!isOpen(current)) return "finished" as const;
        if (current.version !== version) return "changed" as const;
        if (input.startsAt !== current.startsAt && Date.parse(input.startsAt) < now.getTime()) return "past" as const;
        const seat = await chooseTable(tx, cafeId, input.table, input.startsAt, input.partySize, {
          exceptId: id,
          keep: current.tableId,
        });
        if (typeof seat === "string") return seat;
        // 확정한 예약을 다시 가예약으로 되돌리지는 않는다.
        const status = current.status === "confirmed" ? "confirmed" : input.status;
        const [updated] = await tx
          .update(reservations)
          .set({
            ...omit(input, "table"),
            startsAt: new Date(input.startsAt),
            memo: input.memo ?? null,
            status,
            tableId: seat.tableId,
            version: nextVersion(),
          })
          .where(and(byId(cafeId, id), eq(reservations.version, version)))
          .returning();
        return updated ? toReservation(updated, await labelOf(tx, seat.tableId)) : ("changed" as const);
      });
    },

    async setStatus(cafeId, id, status, now) {
      const current = await find(cafeId, id);
      if (!current) return "not-found";
      if (!isOpen(current)) return "finished";
      if (!canChangeReservation(current.status, status)) return "invalid-transition";
      if (status === "no_show" && Date.parse(current.startsAt) > now.getTime()) return "too-early";
      const [row] = await db
        .update(reservations)
        .set({
          status,
          closedAt: OPEN_RESERVATION_STATUSES.includes(status) ? null : now,
          // 상태도 수정 폼이 고치는 값이라, 열려 있던 수정 폼이 이 변경을 덮지 않게 버전을 올린다.
          version: nextVersion(),
        })
        .where(unchanged(current))
        .returning();
      return row ? toReservation(row) : "changed";
    },

    async findForKiosk(cafeId, last4, now) {
      const rows = await db
        .select()
        .from(reservations)
        .where(and(onDay(cafeId, toKstDate(now.getTime())), inArray(reservations.status, [...OPEN_RESERVATION_STATUSES])))
        .orderBy(asc(reservations.startsAt));
      return rows.map((r) => toReservation(r)).filter((r) => phoneLast4(r.phone) === last4);
    },

    async checkIn(cafeId, id, last4, now) {
      const current = await find(cafeId, id);
      // 도착은 예약한 날(한국 날짜) 당일에만 받는다.
      if (!current || phoneLast4(current.phone) !== last4 || !isSameDay(current.startsAt, now, { in: inKst })) {
        return "not-found";
      }
      if (!isOpen(current)) return "finished";
      if (current.arrivedAt) return current;
      // 그사이 입장·취소로 끝났으면 도착을 남기지 않는다.
      const [row] = await db
        .update(reservations)
        .set({ arrivedAt: now })
        .where(and(byId(cafeId, id), inArray(reservations.status, [...OPEN_RESERVATION_STATUSES])))
        .returning();
      return row ? toReservation(row) : "finished";
    },

    async book(cafeId, input, now) {
      if (input.partySize > ONLINE_BOOKING.maxPartySize) return "too-many";
      if (!isBookableTime(input.startsAt, now)) return "outside-hours";
      return db.transaction(async (tx) => {
        if (!(await lockOpenCafe(tx, cafeId))) return "closed-cafe" as const;
        // 같은 번호로 같은 날 이 매장에 끝나지 않은 예약이 있으면 받지 않는다.
        // 다만 시각·인원까지 같으면, 응답을 받지 못한(시간 초과 등) 손님이 같은 내용을 다시 보낸 것으로 보고 그 예약을 돌려준다.
        const { from, to } = kstDayRange(toKstDate(Date.parse(input.startsAt)));
        const [same] = await tx
          .select()
          .from(reservations)
          .where(
            and(
              eq(reservations.cafeId, cafeId),
              eq(reservations.phone, input.phone),
              inArray(reservations.status, [...OPEN_RESERVATION_STATUSES]),
              gte(reservations.startsAt, new Date(from)),
              lt(reservations.startsAt, new Date(to)),
            ),
          );
        if (same) {
          const resent = same.source === "online" && same.startsAt.toISOString() === input.startsAt && same.partySize === input.partySize;
          return resent ? toReservation(same, await labelOf(tx, same.tableId)) : ("duplicate" as const);
        }
        const seat = await chooseTable(tx, cafeId, "auto", input.startsAt, input.partySize);
        if (typeof seat === "string") return "full" as const;
        const [row] = await tx
          .insert(reservations)
          .values({
            ...input,
            id: newId("r"),
            cafeId,
            startsAt: new Date(input.startsAt),
            memo: input.memo ?? null,
            // 빈 테이블을 배정해 두므로 바로 확정한다. 변경·취소는 매장에 전화한다.
            status: "confirmed",
            createdAt: now,
            tableId: seat.tableId,
            source: "online",
          })
          .returning();
        return toReservation(row, await labelOf(tx, seat.tableId));
      });
    },

    async availability(cafeId, date, partySize, now) {
      const [cafe] = await db.select().from(cafes).where(and(eq(cafes.id, cafeId), eq(cafes.status, "open")));
      if (!cafe) return null;
      const times = onlineBookingTimes().map((time) => ({ time, startsAt: kstStartsAt(date, time) }));
      const around = seatingWindow(Date.parse(times[0].startsAt), Date.parse(times[times.length - 1].startsAt));
      const [tables, taken] = await Promise.all([tablesOf(db, cafeId), takenBetween(db, cafeId, around.from, around.to)]);
      return {
        cafe: toCafe(cafe),
        slots: times.map(({ time, startsAt }) => ({
          time,
          available:
            partySize <= ONLINE_BOOKING.maxPartySize &&
            isBookableTime(startsAt, now) &&
            pickTable(tables, taken, startsAt, partySize) !== null,
        })),
      };
    },
  };
}
