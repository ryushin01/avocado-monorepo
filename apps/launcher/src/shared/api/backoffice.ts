import "server-only";

import type {
  KioskApiError,
  KioskCafeGames,
  KioskCheckInResult,
  KioskReservationLookup,
  KioskWaitlistJoinResult,
  KioskWaitlistStatus,
} from "@avocado/domain/kiosk";

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
async function call<T>(path: string, init?: { method: "POST"; body: unknown }): Promise<ApiResult<T>> {
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
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    const error = (await res.json().catch(() => undefined)) as KioskApiError | undefined;
    if (res.status === 404) return { ok: false, reason: "not-found", error };
    // 401(토큰 불일치)과 서버 오류는 손님이 고칠 수 없으니 연결 문제로 안내한다.
    if (res.status >= 400 && res.status < 500 && res.status !== 401) {
      return { ok: false, reason: "rejected", error };
    }
    return { ok: false, reason: "unreachable", error };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/** 매장 보유 게임과 지금 이용 가능 여부 */
export const fetchCafeGames = () => call<KioskCafeGames>("/games");

export const lookupReservations = (phone4: string) =>
  call<KioskReservationLookup>(`/reservations?phone4=${encodeURIComponent(phone4)}`);

export const checkInReservation = (id: string, phone4: string) =>
  call<KioskCheckInResult>(`/reservations/${encodeURIComponent(id)}/check-in`, {
    method: "POST",
    body: { phone4 },
  });

export const fetchWaitlist = (phone4?: string) =>
  call<KioskWaitlistStatus>(phone4 ? `/waitlist?phone4=${encodeURIComponent(phone4)}` : "/waitlist");

export const joinWaitlist = (input: { name: string; phone: string; partySize: number }) =>
  call<KioskWaitlistJoinResult>("/waitlist", { method: "POST", body: input });
