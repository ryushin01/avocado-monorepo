import { z } from "zod";

/**
 * 홍보 사이트 → 백오피스 온라인 예약 API의 요청·응답 형태.
 * 백오피스: apps/admin/src/server/booking, 홍보 사이트: apps/web/src/shared/api/booking.ts
 * 두 앱이 따로 배포되므로 홍보 사이트는 받은 응답을 이 스키마로 확인한다. 타입도 스키마에서 나온다.
 * 손님의 휴대전화·이름은 요청에만 들어가고 응답에는 넣지 않는다.
 * 홍보 사이트의 서버만 부른다(Bearer 토큰). 브라우저는 백오피스 주소를 모른다.
 */

/** 온라인 예약을 받는 매장 (운영 중인 매장) */
export const BookingCafeSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
});
export type BookingCafe = z.infer<typeof BookingCafeSchema>;

/** 예약 화면의 선택지. dates: 받는 날짜(한국 날짜 YYYY-MM-DD, 오늘부터), maxPartySize: 온라인으로 받는 최대 인원 */
export const BookingOptionsSchema = z.object({
  cafes: z.array(BookingCafeSchema),
  dates: z.array(z.string()),
  maxPartySize: z.number(),
});
export type BookingOptions = z.infer<typeof BookingOptionsSchema>;

/** 예약을 받을 수 있는 시작 시각 하나 (한국 시각 "HH:mm") */
export const BookingSlotSchema = z.object({
  time: z.string(),
  /** 그 시각에 일행이 앉을 빈 테이블이 있는지 */
  available: z.boolean(),
});
export type BookingSlot = z.infer<typeof BookingSlotSchema>;

export const BookingAvailabilitySchema = z.object({
  cafe: z.object({ id: z.string(), name: z.string() }),
  /** 한국 날짜 YYYY-MM-DD */
  date: z.string(),
  partySize: z.number(),
  slots: z.array(BookingSlotSchema),
});
export type BookingAvailability = z.infer<typeof BookingAvailabilitySchema>;

/** 예약 요청. 날짜·시각은 한국 시간이다. 백오피스가 다시 검증한다. agreed: 개인정보 수집·이용 동의 */
export type BookingRequest = {
  date: string;
  time: string;
  partySize: number;
  name: string;
  phone: string;
  memo?: string;
  agreed: boolean;
};

export const BookingResultSchema = z.object({
  reservation: z.object({
    id: z.string(),
    cafeName: z.string(),
    /** 방문 시각 (ISO) */
    startsAt: z.string(),
    partySize: z.number(),
    /** 배정한 테이블 이름 */
    table: z.string(),
  }),
});
export type BookingResult = z.infer<typeof BookingResultSchema>;

/**
 * 오류 응답. code로 화면 문구를 고른다.
 * - invalid: 입력 오류(fieldErrors), full: 그 시각에 빈 테이블이 없음, duplicate: 같은 날 같은 번호의 예약이 있음,
 *   closed: 받지 않는 매장, rate-limited: 요청이 너무 많음, unavailable: 온라인 예약을 받지 않는 상태
 */
export const BookingErrorSchema = z.object({
  code: z.enum(["invalid", "full", "duplicate", "closed", "rate-limited", "unavailable"]),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type BookingError = z.infer<typeof BookingErrorSchema>;
