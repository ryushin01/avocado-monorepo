import type { CafeTable } from "@/entities/cafe/@x/reservation";
import { addDays } from "date-fns/addDays";
import { addMinutes } from "date-fns/addMinutes";
import { areIntervalsOverlapping } from "date-fns/areIntervalsOverlapping";
import { eachMinuteOfInterval } from "date-fns/eachMinuteOfInterval";
import { isBefore } from "date-fns/isBefore";
import { parse } from "date-fns/parse";

import { inKst, kstIso, toKstDate, toKstTime } from "@/shared/lib/kst-time";

/**
 * 정원·테이블 배정 규칙 (DB와 무관한 순수 함수). 저장소(server/reservations)가 트랜잭션 안에서 쓴다.
 *
 * - 예약 하나는 테이블 하나를 RESERVATION_MINUTES 동안 쓴다. 시작 시각이 그보다 가까운 두 예약은 같은 테이블에 앉을 수 없다.
 * - 끝나지 않은 예약(가예약·확정)과 입장한 예약이 테이블을 차지한다. 취소·노쇼는 자리를 비운다.
 * - 현장 대기 손님과 예약 없이 앉은 손님은 세지 않는다(직원이 화면을 보고 정함).
 */
export const RESERVATION_MINUTES = 120;

/**
 * 손님 온라인 예약 규칙. 매장마다 마감(22~24시)이 달라, 가장 이른 마감에도 2시간을 쓸 수 있게 20시 시작까지 받는다.
 * 인원이 더 많거나 다른 시각은 매장으로 전화해 직원이 받는다.
 */
export const ONLINE_BOOKING = {
  firstTime: "12:00",
  lastTime: "20:00",
  stepMinutes: 30,
  /** 오늘부터 며칠 뒤까지 받는지 */
  daysAhead: 14,
  /** 지금부터 이 시간 뒤의 시각만 받는다(매장이 준비할 시간) */
  leadMinutes: 60,
  maxPartySize: 8,
} as const;

/** HH:mm → 기준일(1970-01-01 한국) 그 시각. 시각표를 만들 때만 쓴다. */
const clock = (time: string) => parse(time, "HH:mm", 0, { in: inKst });

/** 시각표는 바뀌지 않으므로 모듈을 읽을 때 한 번만 만든다(예약 가능 날짜 계산이 수백 번 확인한다). */
const BOOKING_TIMES: readonly string[] = eachMinuteOfInterval(
  { start: clock(ONLINE_BOOKING.firstTime), end: clock(ONLINE_BOOKING.lastTime) },
  { step: ONLINE_BOOKING.stepMinutes, in: inKst },
).map((time) => toKstTime(time.getTime()));

/** 온라인으로 받는 시작 시각 ("12:00", "12:30", … "20:00") */
export function onlineBookingTimes(): string[] {
  return [...BOOKING_TIMES];
}

/** 한국 날짜(YYYY-MM-DD)와 시각(HH:mm)의 ISO 시각 */
export const kstStartsAt = kstIso;

/** 온라인으로 받는 시각인지: 받는 시각표에 있고, 지금부터 준비 시간 뒤이며, 받는 기간(오늘부터 daysAhead일 뒤까지) 안 */
export function isBookableTime(startsAt: string, now: Date): boolean {
  const t = Date.parse(startsAt);
  const lastDay = toKstDate(addDays(now, ONLINE_BOOKING.daysAhead, { in: inKst }).getTime());
  return (
    BOOKING_TIMES.includes(toKstTime(t)) &&
    !isBefore(t, addMinutes(now, ONLINE_BOOKING.leadMinutes)) &&
    toKstDate(t) <= lastDay
  );
}

/** 온라인 예약 화면에 보여줄 날짜(한국 날짜). 오늘은 아직 받을 시각이 남았을 때만 넣는다. */
export function bookableDates(now: Date): string[] {
  const times = onlineBookingTimes();
  const dates: string[] = [];
  for (let day = 0; day <= ONLINE_BOOKING.daysAhead; day++) {
    const date = toKstDate(addDays(now, day, { in: inKst }).getTime());
    if (times.some((time) => isBookableTime(kstStartsAt(date, time), now))) dates.push(date);
  }
  return dates;
}

/** 테이블을 차지하고 있는 예약 (테이블과 시작 시각) */
export type TakenSeat = { tableId: string; startsAt: string };

/** a와 b에 시작하는 두 예약이 같은 테이블에서 겹치는지 */
export const overlaps = (a: string, b: string) => {
  const seat = (startsAt: string) => ({ start: Date.parse(startsAt), end: addMinutes(startsAt, RESERVATION_MINUTES) });
  // 끝 시각이 다른 예약의 시작과 같으면(정확히 2시간 차이) 겹치지 않는다.
  return areIntervalsOverlapping(seat(a), seat(b));
};

/** 이 테이블에 그 시각·인원으로 앉힐 수 없는 이유. 앉힐 수 있으면 null */
export function seatProblem(
  table: CafeTable,
  taken: readonly TakenSeat[],
  startsAt: string,
  partySize: number,
): "inactive" | "too-small" | "taken" | null {
  if (!table.active) return "inactive";
  if (table.seats < partySize) return "too-small";
  if (taken.some((t) => t.tableId === table.id && overlaps(t.startsAt, startsAt))) return "taken";
  return null;
}

/**
 * startsAt에 partySize명이 앉을 수 있는 빈 테이블 중 좌석이 가장 적은 것(같으면 이름순). 없으면 null.
 * 큰 테이블을 작은 일행에 먼저 내주지 않아, 나중에 오는 큰 일행의 자리가 남는다.
 */
export function pickTable(
  tables: readonly CafeTable[],
  taken: readonly TakenSeat[],
  startsAt: string,
  partySize: number,
): CafeTable | null {
  const fits = tables
    .filter((table) => seatProblem(table, taken, startsAt, partySize) === null)
    .sort((a, b) => a.seats - b.seats || a.label.localeCompare(b.label, "ko", { numeric: true }));
  return fits[0] ?? null;
}
