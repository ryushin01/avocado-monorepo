import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { BookingError } from "@avocado/domain/booking";
import { logError } from "@avocado/logger";

import { getDb } from "@/db/server";

import { createRateLimiter, type RateLimit } from "../rate-limit/repository";

/**
 * 손님이 쓰는 요청이라 방문자마다 센다. 방문자 키는 홍보 사이트가 접속 주소를 HMAC으로 바꿔 넘긴다(x-booking-client).
 * - read: 선택지·빈 시각 조회. 날짜·인원을 바꿔 보는 정도는 넉넉하다.
 * - book: 예약 등록. 같은 번호는 하루 한 건이라, 한 사람이 10분에 10번 넘게 보낼 일은 없다.
 */
export const BOOKING_LIMITS = {
  read: { limit: 60, windowMs: 60_000 },
  book: { limit: 10, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimit>;

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * 예약 API 접근 규칙 (DB와 무관한 순수 함수). 홍보 사이트의 서버만 부른다.
 * - expected(BOOKING_API_TOKEN)가 있으면 Authorization: Bearer <그 값>이어야 한다. 아니면 401.
 * - 없으면: 운영에서는 온라인 예약을 받지 않는다(503). 개발 중에는 편의상 허용한다.
 * 통과하면 null
 */
export function checkBookingAccess(
  authorization: string | null,
  expected: string | undefined,
  production: boolean,
): { status: 401 | 503; message: string } | null {
  if (!expected) return production ? { status: 503, message: "지금은 온라인 예약을 받지 않습니다." } : null;
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  // 길이가 달라도 같은 시간이 걸리게 해시끼리 비교한다.
  if (token && timingSafeEqual(digest(token), digest(expected))) return null;
  return { status: 401, message: "예약 API 인증이 필요합니다." };
}

export const bookingError = (
  status: number,
  code: BookingError["code"],
  message: string,
  fieldErrors?: BookingError["fieldErrors"],
) =>
  Response.json({ code, message, fieldErrors } satisfies BookingError, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export const bookingJson = <T,>(body: T, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** 예약 API 라우트에서 맨 먼저 부른다. 막으면 보낼 응답, 통과하면 null */
export function rejectUnauthorizedBooking(request: Request): Response | null {
  const denied = checkBookingAccess(
    request.headers.get("authorization"),
    process.env.BOOKING_API_TOKEN,
    process.env.NODE_ENV === "production",
  );
  // 손님이 고칠 수 없는 문제라 코드는 unavailable이다. 토큰 오류는 홍보 사이트 쪽 로그(booking_error)에 남는다.
  return denied ? bookingError(denied.status, "unavailable", denied.message) : null;
}

/** 인증 뒤에 부른다. 넘으면 보낼 응답(429), 괜찮으면 null */
export async function rejectOverBookingLimit(
  request: Request,
  kind: keyof typeof BOOKING_LIMITS,
): Promise<Response | null> {
  // 원래 접속 주소는 받지 않는다. 키가 없으면 한 묶음으로 센다.
  const client = request.headers.get("x-booking-client")?.slice(0, 64) || "unknown";
  const result = await createRateLimiter(await getDb()).consume(
    `booking:${kind}:${client}`,
    BOOKING_LIMITS[kind],
    new Date(),
  );
  if (result.allowed) return null;
  logError("admin", "booking_rate_limited", { kind });
  const response = bookingError(429, "rate-limited", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  return response;
}
