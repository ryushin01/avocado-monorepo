import "server-only";

import type { KioskApiError } from "@avocado/domain/kiosk";
import { logError } from "@avocado/logger";

import { getDb } from "@/db/server";

import { createRateLimiter } from "../rate-limit/repository";
import { createKioskDeviceRepository, hashKioskToken, type KioskVerifyResult } from "./devices";

/**
 * 전화번호 뒷자리로 손님을 찾거나 대기를 등록하는 요청의 기기별 제한.
 * 뒷자리는 1만 가지뿐이라, 토큰이 유출돼도 빠르게 훑어보지 못하게 한다.
 * 분당 30번이면 1만 가지를 다 시도하는 데 5시간 넘게 걸리고, 손님 사용에는 부족하지 않다.
 */
export const KIOSK_GUEST_LIMIT = { limit: 30, windowMs: 60_000 };

/**
 * 키오스크 API 접근 규칙 (DB와 무관한 순수 함수).
 * - 토큰이 있으면: 그 매장의 사용 중인 기기 토큰이어야 한다. 다른 매장 토큰은 403, 없거나 폐기한 토큰은 401.
 * - 토큰이 없으면: 운영에서는 401. 개발 중에는 편의상 허용한다.
 * 통과하면 null, 막으면 상태 코드와 문구
 */
export async function checkKioskAccess(
  authorization: string | null,
  verify: (token: string) => Promise<KioskVerifyResult>,
  production: boolean,
): Promise<{ status: 401 | 403; message: string } | null> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    return production ? { status: 401, message: "키오스크 인증이 필요합니다." } : null;
  }
  const result = await verify(token);
  if (result === "ok") return null;
  if (result === "wrong-cafe") return { status: 403, message: "이 매장의 키오스크가 아닙니다." };
  return { status: 401, message: "사용할 수 없는 키오스크 토큰입니다." };
}

/** 키오스크 API 라우트에서 부른다. 막으면 보낼 응답, 통과하면 null */
export async function rejectUnauthorizedKiosk(request: Request, cafeId: string): Promise<Response | null> {
  const devices = createKioskDeviceRepository(await getDb());
  const denied = await checkKioskAccess(
    request.headers.get("authorization"),
    (token) => devices.verify(token, cafeId, new Date()),
    process.env.NODE_ENV === "production",
  );
  return denied ? kioskError(denied.status, denied.message) : null;
}

/** 손님 정보를 다루는 요청에서 인증 뒤에 부른다. 넘으면 보낼 응답, 괜찮으면 null */
export async function rejectOverKioskLimit(request: Request, cafeId: string): Promise<Response | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  // 토큰 원문은 저장하지 않는다. 토큰 없는 요청은 개발 중에만 여기까지 온다.
  const key = token ? `kiosk:${hashKioskToken(token)}` : `kiosk:no-token:${cafeId}`;
  const result = await createRateLimiter(await getDb()).consume(key, KIOSK_GUEST_LIMIT, new Date());
  if (result.allowed) return null;
  logError("admin", "kiosk_rate_limited", { cafeId });
  const response = kioskError(429, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  return response;
}

export const kioskError = (status: number, message: string, fieldErrors?: KioskApiError["fieldErrors"]) =>
  Response.json({ message, fieldErrors } satisfies KioskApiError, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export const kioskJson = <T,>(body: T) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
