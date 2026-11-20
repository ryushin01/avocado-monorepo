import "server-only";

import { createHmac } from "node:crypto";

import {
  BookingAvailabilitySchema,
  type BookingError,
  BookingErrorSchema,
  BookingOptionsSchema,
  type BookingRequest,
  BookingResultSchema,
} from "@avocado/domain/booking";
import { logError } from "@avocado/logger";
import { headers } from "next/headers";
import { connection } from "next/server";
import type { ZodType } from "zod";

const production = process.env.NODE_ENV === "production";

/**
 * 온라인 예약을 받는 백오피스와 예약 API 토큰(백오피스의 BOOKING_API_TOKEN과 같은 값).
 * 개발 중에는 로컬 백오피스를 쓰고, 운영에서는 둘 다 있어야 예약을 연다. 없으면 예약 화면이 전화 예약을 안내한다.
 * 토큰은 서버에만 있다. 브라우저는 이 사이트의 서버 액션만 부르고 백오피스 주소를 모른다.
 */
export const BOOKING_CONFIG = {
  backofficeUrl: process.env.BACKOFFICE_URL || (production ? "" : "http://localhost:3000"),
  apiToken: process.env.BOOKING_API_TOKEN ?? "",
};

/** 운영에서 빠진 설정의 환경 변수 이름. 개발 중에는 늘 빈 배열 */
export function missingBookingConfig(): string[] {
  if (!production) return [];
  const { backofficeUrl, apiToken } = BOOKING_CONFIG;
  return [
    ["BACKOFFICE_URL", backofficeUrl],
    ["BOOKING_API_TOKEN", apiToken],
  ].flatMap(([name, value]) => (value ? [] : [name]));
}

/**
 * - off: 온라인 예약을 열지 않음(설정이 없거나 백오피스가 받지 않음)
 * - rejected: 손님이 고칠 수 있는 거절(입력 오류·빈자리 없음·중복 등, error에 문구와 칸)
 * - unreachable: 연결 실패·서버 오류·토큰 오류·약속과 다른 응답
 */
export type BookingApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "off" | "rejected" | "unreachable"; error?: BookingError };

/**
 * 방문자 키: 접속 주소(x-forwarded-for의 첫 값)의 HMAC. 백오피스가 방문자마다 요청 수를 셀 때만 쓰며, 원래 주소는 보내지 않는다.
 */
export function visitorKey(forwardedFor: string | null): string {
  const address = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return createHmac("sha256", BOOKING_CONFIG.apiToken || "dev").update(address).digest("hex").slice(0, 32);
}

async function call<T>(
  path: string,
  schema: ZodType<T>,
  init?: { method: "POST"; body: unknown },
): Promise<BookingApiResult<T>> {
  // 요청 시점에만 부른다. 빌드(프리렌더링) 중에 부르면 그 결과가 정적 화면에 굳는다.
  await connection();
  if (missingBookingConfig().length > 0) return { ok: false, reason: "off" };
  const { backofficeUrl, apiToken } = BOOKING_CONFIG;
  const url = new URL(path, backofficeUrl);
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        ...(apiToken ? { authorization: `Bearer ${apiToken}` } : {}),
        "x-booking-client": visitorKey((await headers()).get("x-forwarded-for")),
        ...(init ? { "content-type": "application/json" } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
    });
    const body = await res.json().catch(() => undefined);
    if (res.ok) {
      // 두 앱은 따로 배포되므로 응답이 약속과 다를 수 있다. 화면이 깨지는 대신 연결 문제로 안내한다.
      const parsed = schema.safeParse(body);
      if (parsed.success) return { ok: true, data: parsed.data };
      logError("web", "booking_invalid_response", { path: url.pathname, issues: parsed.error.issues.length });
      return { ok: false, reason: "unreachable" };
    }
    const errorBody = BookingErrorSchema.safeParse(body);
    const error = errorBody.success ? errorBody.data : undefined;
    // 백오피스가 온라인 예약을 받지 않는 상태(토큰 미설정)
    if (res.status === 503 && error?.code === "unavailable") return { ok: false, reason: "off", error };
    if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) {
      return { ok: false, reason: "rejected", error };
    }
    // 토큰이 다르거나 백오피스가 고장 난 경우. 손님이 고칠 수 없으므로 원인은 로그로 남긴다.
    logError("web", "booking_error", { path: url.pathname, status: res.status });
    return { ok: false, reason: "unreachable", error };
  } catch (cause) {
    const interrupted = cause instanceof Error && cause.message.startsWith("During prerendering");
    if (!interrupted) logError("web", "booking_unreachable", { path: url.pathname, error: cause });
    return { ok: false, reason: "unreachable" };
  }
}

const cafePath = (cafeId: string) => `/api/booking/cafes/${encodeURIComponent(cafeId)}`;

/** 예약 화면의 선택지: 받는 매장, 날짜, 최대 인원 */
export const fetchBookingOptions = () => call("/api/booking/options", BookingOptionsSchema);

/** 그날 받는 시각마다 일행이 앉을 빈 테이블이 있는지 */
export const fetchBookingAvailability = (cafeId: string, date: string, partySize: number) =>
  call(
    `${cafePath(cafeId)}/availability?${new URLSearchParams({ date, partySize: String(partySize) })}`,
    BookingAvailabilitySchema,
  );

/** 예약 등록. 빈 테이블을 자동으로 배정해 확정한다. */
export const submitBooking = (cafeId: string, request: BookingRequest) =>
  call(`${cafePath(cafeId)}/reservations`, BookingResultSchema, { method: "POST", body: request });
