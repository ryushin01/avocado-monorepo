import "server-only";

import type { KioskCafeGames } from "@avocado/domain/kiosk";

import { LAUNCHER_CONFIG } from "./config";

export type CafeGamesResult =
  | { ok: true; data: KioskCafeGames }
  | { ok: false; reason: "not-found" | "unreachable" };

/**
 * 백오피스에서 이 매장의 보유 게임과 지금 이용 가능 여부를 읽는다.
 * 손님이 보는 화면이라 항상 최신 값을 읽는다(캐시하지 않음).
 */
export async function fetchCafeGames(): Promise<CafeGamesResult> {
  const { backofficeUrl, cafeId } = LAUNCHER_CONFIG;
  const url = new URL(`/api/kiosk/cafes/${encodeURIComponent(cafeId)}/games`, backofficeUrl);
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "unreachable" };
    return { ok: true, data: (await res.json()) as KioskCafeGames };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
