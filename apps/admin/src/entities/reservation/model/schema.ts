import { z } from "zod";

import { firstParam } from "@/shared/lib/search-params";
import { omit } from "@/shared/lib/omit";
import { isMobilePhone, normalizePhone } from "@/entities/guest/@x/reservation";

import { ONLINE_BOOKING } from "./seating";
import { RESERVATION_STATUSES } from "./types";

export const guestName = z
  .string({ error: "이름을 입력해주세요." })
  .trim()
  .min(1, "이름을 입력해주세요.")
  .max(20, "이름은 20자 이하여야 합니다.");

export const guestPhone = z
  .string({ error: "전화번호를 입력해주세요." })
  .transform(normalizePhone)
  .refine(isMobilePhone, "휴대전화 번호를 010-1234-5678 형식으로 입력해주세요.");

export const partySize = z.coerce
  .number({ error: "인원을 입력해주세요." })
  .int("인원은 정수여야 합니다.")
  .min(1, "인원은 1명 이상이어야 합니다.")
  .max(20, "인원은 20명 이하여야 합니다.");

const optionalMemo = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(100, "메모는 100자 이하여야 합니다.").optional(),
);
const kstDate = z.iso.date({ error: "날짜를 입력해주세요." });
const kstTime = z
  .string({ error: "시각을 입력해주세요." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시각을 입력해주세요.");
const toStartsAt = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`).toISOString();

/** 백오피스 예약 등록·수정 폼. 날짜·시각은 한국 시간으로 받는다. */
export const reservationInputSchema = z
  .object({
    name: guestName,
    phone: guestPhone,
    partySize,
    date: kstDate,
    time: kstTime,
    memo: optionalMemo,
    status: z.enum(["pending", "confirmed"], { error: "상태를 선택해주세요." }).default("confirmed"),
    /** 테이블: auto(빈 테이블 자동 배정), none(배정 안 함), 또는 테이블 id */
    table: z.preprocess((v) => (v === "" || v === undefined ? "auto" : v), z.string().min(1)),
  })
  .transform(({ date, time, ...rest }) => ({ ...rest, startsAt: toStartsAt(date, time) }));

export type ReservationInput = z.infer<typeof reservationInputSchema>;

/**
 * 손님 온라인 예약(홍보 사이트 → 백오피스 API). 받는 날짜·시각 규칙은 저장소가 확인한다(seating의 ONLINE_BOOKING).
 * 개인정보 수집·이용 동의(agreed)가 없으면 받지 않는다.
 */
export const onlineBookingSchema = z
  .object({
    name: guestName,
    phone: guestPhone,
    partySize: z.coerce
      .number({ error: "인원을 골라주세요." })
      .int("인원을 골라주세요.")
      .min(1, "인원을 골라주세요.")
      .max(
        ONLINE_BOOKING.maxPartySize,
        `온라인 예약은 ${ONLINE_BOOKING.maxPartySize}명까지 받습니다. 더 많으면 매장으로 전화해주세요.`,
      ),
    date: z.iso.date({ error: "날짜를 골라주세요." }),
    time: z.string({ error: "시각을 골라주세요." }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시각을 골라주세요."),
    memo: optionalMemo,
    agreed: z.literal(true, { error: "개인정보 수집·이용에 동의해주세요." }),
  })
  // 동의는 받았는지만 확인하고 저장하지 않는다.
  .transform(({ date, time, ...rest }) => ({ ...omit(rest, "agreed"), startsAt: toStartsAt(date, time) }));

export type OnlineBookingInput = z.infer<typeof onlineBookingSchema>;

/** 온라인 예약 화면의 빈 시각 조회(쿼리 문자열) */
export const bookingAvailabilityQuerySchema = z.object({
  date: z.iso.date({ error: "날짜를 골라주세요." }),
  partySize: z.coerce
    .number({ error: "인원을 골라주세요." })
    .int("인원을 골라주세요.")
    .min(1, "인원을 골라주세요.")
    .max(ONLINE_BOOKING.maxPartySize, `온라인 예약은 ${ONLINE_BOOKING.maxPartySize}명까지 받습니다.`),
});
/** 예약 폼의 테이블 선택: 자동 배정, 배정 안 함, 또는 테이블 id */
export type ReservationTableChoice = "auto" | "none" | (string & {});

export const reservationStatusSchema = z.enum(RESERVATION_STATUSES, {
  error: "알 수 없는 상태입니다.",
});

/** 목록 날짜(YYYY-MM-DD). 없거나 잘못되면 undefined (화면이 오늘로 정함) */
export function parseReservationDate(params: Record<string, string | string[] | undefined>) {
  const date = z.iso.date().safeParse(firstParam(params.date));
  return date.success ? date.data : undefined;
}

/** 키오스크 조회: 전화번호 뒷자리 4자리 */
export const phoneLast4Schema = z.string().regex(/^\d{4}$/, "전화번호 뒷자리 4자리를 입력해주세요.");
