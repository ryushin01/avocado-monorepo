import "server-only";

import { logError } from "@avocado/logger";
import {
  type KioskApiError,
  KioskApiErrorSchema,
  type KioskCafeGames,
  KioskCafeGamesSchema,
  KioskCheckInResultSchema,
  KioskReservationLookupSchema,
  KioskWaitlistJoinResultSchema,
  KioskWaitlistStatusSchema,
} from "@avocado/domain/kiosk";
import { connection } from "next/server";
import superagent from "superagent";
import type { ZodType } from "zod";

import { isDemoMode } from "@/shared/config";

import { LAUNCHER_CONFIG, missingLauncherConfig } from "./config";
import { offlineCafeGames } from "./offline-games";

const production = process.env.NODE_ENV === "production";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not-found" | "unreachable" | "rejected"; error?: KioskApiError };

/** 버퍼로 받은 본문을 JSON으로 읽는다. 비었거나 JSON이 아니면 undefined(뒤의 zod 검증이 걸러 낸다). */
function readJson(body: unknown): unknown {
  if (!Buffer.isBuffer(body)) return undefined;
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    return undefined;
  }
}

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
  // 요청 시점에만 부른다. 빌드 중(프리렌더링)에 여기서 바로 돌아오면 그 결과(연결 안내)가 정적 화면에 굳는다.
  // 설정이 없는 빌드에서도 화면은 요청마다 그려지고, 아래 설정 확인도 요청 때만 한다.
  await connection();
  const missing = missingLauncherConfig();
  if (missing.length > 0) {
    // 운영에서 설정이 빠지면 부르지 않고 연결 문제로 안내한다.
    logError("launcher", "launcher_config_missing", { missing });
    return { ok: false, reason: "unreachable" };
  }
  const { backofficeUrl, cafeId, apiToken } = LAUNCHER_CONFIG;
  const url = new URL(`/api/kiosk/cafes/${encodeURIComponent(cafeId)}${path}`, backofficeUrl);
  try {
    // SuperAgent(Node http)는 Next.js의 fetch 캐시를 거치지 않으므로 cache: "no-store"와 같게 매번 새로 읽는다.
    // .ok(() => true): 4xx·5xx도 예외 대신 응답으로 받아 아래에서 상태별로 나눈다.
    // .responseType: 본문을 버퍼로 받아, 모양이 틀린 JSON도 예외 대신 아래 검증에서 걸러지게 한다(fetch의 res.json().catch와 같게).
    const req = superagent(init?.method ?? "GET", url.href)
      // 공개 데모의 백오피스는 한동안 쉬면 메모리 DB를 새로 만드느라 첫 응답이 느리다.
      .timeout(isDemoMode() ? 15_000 : 5000)
      .ok(() => true)
      .responseType("arraybuffer");
    if (apiToken) req.set("authorization", `Bearer ${apiToken}`);
    if (init) req.set("content-type", "application/json").send(JSON.stringify(init.body));
    const res = await req;
    if (res.ok) {
      // 백오피스와 런처는 따로 배포되므로 응답이 약속과 다를 수 있다. 손님 화면이 깨지는 대신 연결 문제로 안내한다.
      const parsed = schema.safeParse(readJson(res.body));
      if (parsed.success) return { ok: true, data: parsed.data };
      logError("launcher", "backoffice_invalid_response", { path: url.pathname, issues: parsed.error.issues.length });
      return { ok: false, reason: "unreachable" };
    }
    const errorBody = KioskApiErrorSchema.safeParse(readJson(res.body));
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
    // 연결 실패·시간 초과. (Next.js fetch가 프리렌더링 끝에 요청을 끊던 일은 SuperAgent에서 생기지 않고,
    // 위 connection()이 프리렌더링 중에는 여기까지 오지 않게 한다.)
    logError("launcher", "backoffice_unreachable", { path: url.pathname, error: cause });
    return { ok: false, reason: "unreachable" };
  }
}

/** 매장 보유 게임과 지금 이용 가능 여부 */
export const fetchCafeGames = () => call("/games", KioskCafeGamesSchema);

/** 스냅숏으로 대신 보여 줄 수 있는 환경: 공개 데모와 개발 중. 실제 매장 운영(데모 아닌 프로덕션)에서는 엉뚱한 목록 대신 연결 문제를 알린다. */
const snapshotAllowed = () => isDemoMode() || !production;

/**
 * 화면용 보유 게임. 백오피스에 닿지 않으면(연결 실패·시간 초과·설정 없음) 공개 데모와 개발 중에는
 * 함께 배포한 카탈로그 스냅숏으로 대신하고 offline으로 알린다. 매장 없음(404)은 그대로 알린다.
 */
export async function fetchCafeGamesOrSnapshot(): Promise<
  { ok: true; data: KioskCafeGames; offline: boolean } | Extract<ApiResult<KioskCafeGames>, { ok: false }>
> {
  const result = await fetchCafeGames();
  if (result.ok) return { ...result, offline: false };
  if (result.reason !== "unreachable" || !snapshotAllowed()) return result;
  return { ok: true, data: offlineCafeGames(LAUNCHER_CONFIG.cafeId), offline: true };
}

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
