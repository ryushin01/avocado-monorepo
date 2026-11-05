import "server-only";

import type { KioskApiError } from "@avocado/domain/kiosk";

import { getDb } from "@/db/server";

import { createKioskDeviceRepository, type KioskVerifyResult } from "./devices";

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

export const kioskError = (status: number, message: string, fieldErrors?: KioskApiError["fieldErrors"]) =>
  Response.json({ message, fieldErrors } satisfies KioskApiError, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export const kioskJson = <T,>(body: T) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
