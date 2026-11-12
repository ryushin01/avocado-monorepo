import { z } from "zod";

import { GAME_CATEGORIES, GAME_DIFFICULTIES } from "./catalog/types";

/**
 * 백오피스 → 가맹점 런처(손님용 키오스크) 조회 API의 응답 형태.
 * 백오피스: apps/admin/src/app/api/kiosk, 런처: apps/launcher/src/shared/api/backoffice.ts
 * 두 앱이 따로 배포되므로, 런처는 받은 응답을 이 스키마로 확인한다. 타입도 스키마에서 나온다.
 */

/** 키오스크에 보여줄 게임 하나의 지금 상태: 바로 빌릴 수 있음, 모든 박스를 손님이 쓰는 중, 점검 중 */
export const KioskGameAvailabilitySchema = z.enum(["available", "in-use", "unavailable"]);
export type KioskGameAvailability = z.infer<typeof KioskGameAvailabilitySchema>;

export const KioskGameSchema = z.object({
  id: z.string(),
  name: z.string(),
  englishName: z.string().optional(),
  /** 절대 주소 (백오피스가 제공하는 썸네일) */
  thumbnailUrl: z.string().optional(),
  categories: z.array(z.enum(GAME_CATEGORIES)),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  playTimeMin: z.number(),
  playTimeMax: z.number(),
  difficulty: z.enum(GAME_DIFFICULTIES),
  availability: KioskGameAvailabilitySchema,
  /** 지금 빌릴 수 있는 박스 수 */
  availableCount: z.number(),
});
export type KioskGame = z.infer<typeof KioskGameSchema>;

export const KioskCafeGamesSchema = z.object({
  cafe: z.object({ id: z.string(), name: z.string() }),
  /** 폐기한 게임은 빠진다. 이름순 */
  games: z.array(KioskGameSchema),
  /** 응답을 만든 시각 (ISO) */
  generatedAt: z.string(),
});
export type KioskCafeGames = z.infer<typeof KioskCafeGamesSchema>;

// ── 예약·현장 대기 ─────────────────────────────────────────────
// 키오스크는 다른 손님도 보는 화면이라 이름은 가리고(김*수) 전화번호는 보내지 않는다.

/** 오늘 아직 끝나지 않은 내 예약 */
export const KioskReservationSchema = z.object({
  id: z.string(),
  maskedName: z.string(),
  /** 방문 예정 시각 (ISO) */
  startsAt: z.string(),
  partySize: z.number(),
  status: z.enum(["pending", "confirmed"]),
  /** 이미 도착을 알렸는지 */
  arrived: z.boolean(),
});
export type KioskReservation = z.infer<typeof KioskReservationSchema>;

/** 줄에 있는 내 대기 */
export const KioskWaitlistEntrySchema = z.object({
  id: z.string(),
  /** 그날 대기 번호 */
  number: z.number(),
  maskedName: z.string(),
  partySize: z.number(),
  status: z.enum(["waiting", "called"]),
  /** 내 앞에 남은 팀 수 */
  ahead: z.number(),
});
export type KioskWaitlistEntry = z.infer<typeof KioskWaitlistEntrySchema>;

/** GET /api/kiosk/cafes/{cafeId}/reservations?phone4= */
export const KioskReservationLookupSchema = z.object({ reservations: z.array(KioskReservationSchema) });
export type KioskReservationLookup = z.infer<typeof KioskReservationLookupSchema>;

/** POST /api/kiosk/cafes/{cafeId}/reservations/{id}/check-in  { phone4 } */
export const KioskCheckInResultSchema = z.object({ reservation: KioskReservationSchema });
export type KioskCheckInResult = z.infer<typeof KioskCheckInResultSchema>;

/** GET /api/kiosk/cafes/{cafeId}/waitlist[?phone4=] */
export const KioskWaitlistStatusSchema = z.object({
  /** 지금 줄에 있는 팀 수 */
  waitingTeams: z.number(),
  /** phone4를 주면 뒷자리가 같은 내 대기 */
  mine: z.array(KioskWaitlistEntrySchema),
});
export type KioskWaitlistStatus = z.infer<typeof KioskWaitlistStatusSchema>;

/** POST /api/kiosk/cafes/{cafeId}/waitlist  { name, phone, partySize } */
export const KioskWaitlistJoinResultSchema = z.object({ entry: KioskWaitlistEntrySchema });
export type KioskWaitlistJoinResult = z.infer<typeof KioskWaitlistJoinResultSchema>;

/** 4xx 응답. 입력 오류면 fieldErrors에 칸별 문구가 있다. */
export const KioskApiErrorSchema = z.object({
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string()).optional()).optional(),
});
export type KioskApiError = z.infer<typeof KioskApiErrorSchema>;
