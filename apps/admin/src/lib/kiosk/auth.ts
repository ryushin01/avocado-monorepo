import "server-only";

import type { KioskApiError } from "@avocado/domain/kiosk";

/**
 * 키오스크 API 접근 확인. KIOSK_API_TOKEN이 설정돼 있으면 런처가 보낸
 * `Authorization: Bearer <토큰>`이 같아야 한다. 설정하지 않으면(개발) 모두 허용한다.
 *
 * TODO: 로그인이 정해지면 매장별 키오스크 토큰으로 바꿔, 토큰으로 매장도 확인한다.
 * 실패하면 보낼 응답, 통과하면 null
 */
export function rejectUnauthorizedKiosk(request: Request): Response | null {
  const token = process.env.KIOSK_API_TOKEN;
  if (!token) return null;
  if (request.headers.get("authorization") === `Bearer ${token}`) return null;
  const body: KioskApiError = { message: "키오스크 인증이 필요합니다." };
  return Response.json(body, { status: 401 });
}

export const kioskError = (status: number, message: string, fieldErrors?: KioskApiError["fieldErrors"]) =>
  Response.json({ message, fieldErrors } satisfies KioskApiError, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export const kioskJson = <T,>(body: T) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
