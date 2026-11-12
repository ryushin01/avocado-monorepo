import "server-only";

import { logError } from "@avocado/logger";
import {
  type KioskApiError,
  KioskApiErrorSchema,
  KioskCafeGamesSchema,
  KioskCheckInResultSchema,
  KioskReservationLookupSchema,
  KioskWaitlistJoinResultSchema,
  KioskWaitlistStatusSchema,
} from "@avocado/domain/kiosk";
import type { ZodType } from "zod";

import { LAUNCHER_CONFIG } from "./config";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not-found" | "unreachable" | "rejected"; error?: KioskApiError };

/**
 * 백오피스 키오스크 API 호출. 손님이 보는 화면이라 항상 최신 값을 읽는다(캐시하지 않음).
 * - not-found: 매장이 없거나 폐점 (404)
 * - rejected: 입력 오류·중복 등 (4xx, error에 문구)
 * - unreachable: 연결 실패·서버 오류
 */
async function call<T>(
  path: string,
  schema: ZodType<T>,
  init?: { method: "POST"; body: unknown },
): Promise<ApiResult<T>> {
  const { backofficeUrl, cafeId, apiToken } = LAUNCHER_CONFIG;
  const url = new URL(`/api/kiosk/cafes/${encodeURIComponent(cafeId)}${path}`, backofficeUrl);
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        ...(apiToken ? { authorization: `Bearer ${apiToken}` } : {}),
        ...(init ? { "content-type": "application/json" } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
    });
    if (res.ok) {
      // 백오피스와 런처는 따로 배포되므로 응답이 약속과 다를 수 있다. 손님 화면이 깨지는 대신 연결 문제로 안내한다.
      const parsed = schema.safeParse(await res.json().catch(() => undefined));
      if (parsed.success) return { ok: true, data: parsed.data };
      logError("launcher", "backoffice_invalid_response", { path: url.pathname, issues: parsed.error.issues.length });
      return { ok: false, reason: "unreachable" };
    }
    const errorBody = KioskApiErrorSchema.safeParse(await res.json().catch(() => undefined));
    const error: KioskApiError | undefined = errorBody.success ? errorBody.data : undefined;
    if (res.status === 404) return { ok: false, reason: "not-found", error };
    // 토큰 오류(401), 다른 매장의 토큰(403), 서버 오류는 손님이 고칠 수 없으니 연결 문제로 안내한다.
    if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) {
      return { ok: false, reason: "rejected", error };
    }
    // 토큰이 틀렸거나 백오피스가 고장난 경우. 손님 화면에는 연결 문제로만 보이므로 원인은 로그로 남긴다.
    logError("launcher", "backoffice_error", { path: url.pathname, status: res.status });
    return { ok: false, reason: "unreachable", error };
  } catch (cause) {
    // 프리렌더링이 끝나 Next.js가 요청을 끊은 것은 장애가 아니다.
    const interrupted = cause instanceof Error && cause.message.startsWith("During prerendering");
    if (!interrupted) logError("launcher", "backoffice_unreachable", { path: url.pathname, error: cause });
    return { ok: false, reason: "unreachable" };
  }
}

/** 매장 보유 게임과 지금 이용 가능 여부 */
export const fetchCafeGames = () => call("/games", KioskCafeGamesSchema);

export const lookupReservations = (phone4: string) =>
  call(`/reservations?phone4=${encodeURIComponent(phone4)}`, KioskReservationLookupSchema);

export const checkInReservation = (id: string, phone4: string) =>
  call(`/reservations/${encodeURIComponent(id)}/check-in`, KioskCheckInResultSchema, {
    method: "POST",
    body: { phone4 },
  });

export const fetchWaitlist = (phone4?: string) =>
  call(phone4 ? `/waitlist?phone4=${encodeURIComponent(phone4)}` : "/waitlist", KioskWaitlistStatusSchema);

export const joinWaitlist = (input: { name: string; phone: string; partySize: number }) =>
  call("/waitlist", KioskWaitlistJoinResultSchema, { method: "POST", body: input });
