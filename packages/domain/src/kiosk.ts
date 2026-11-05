import type { GameCategory, GameDifficulty } from "./catalog/types";

/**
 * 백오피스 → 가맹점 런처(손님용 키오스크) 조회 API의 응답 형태.
 * 백오피스: apps/admin/src/app/api/kiosk, 런처: apps/launcher/src/lib/backoffice.ts
 */

/** 키오스크에 보여줄 게임 하나의 지금 상태 */
export type KioskGameAvailability =
  /** 바로 빌릴 수 있음 */
  | "available"
  /** 모든 박스를 손님이 쓰고 있음 */
  | "in-use"
  /** 점검 중 */
  | "unavailable";

export type KioskGame = {
  id: string;
  name: string;
  englishName?: string;
  /** 절대 주소 (백오피스가 제공하는 썸네일) */
  thumbnailUrl?: string;
  categories: GameCategory[];
  minPlayers: number;
  maxPlayers: number;
  playTimeMin: number;
  playTimeMax: number;
  difficulty: GameDifficulty;
  availability: KioskGameAvailability;
  /** 지금 빌릴 수 있는 박스 수 */
  availableCount: number;
};

export type KioskCafeGames = {
  cafe: { id: string; name: string };
  /** 폐기한 게임은 빠진다. 이름순 */
  games: KioskGame[];
  /** 응답을 만든 시각 (ISO) */
  generatedAt: string;
};

// ── 예약·현장 대기 ─────────────────────────────────────────────
// 키오스크는 다른 손님도 보는 화면이라 이름은 가리고(김*수) 전화번호는 보내지 않는다.

/** 오늘 아직 끝나지 않은 내 예약 */
export type KioskReservation = {
  id: string;
  maskedName: string;
  /** 방문 예정 시각 (ISO) */
  startsAt: string;
  partySize: number;
  status: "pending" | "confirmed";
  /** 이미 도착을 알렸는지 */
  arrived: boolean;
};

/** 줄에 있는 내 대기 */
export type KioskWaitlistEntry = {
  id: string;
  /** 그날 대기 번호 */
  number: number;
  maskedName: string;
  partySize: number;
  status: "waiting" | "called";
  /** 내 앞에 남은 팀 수 */
  ahead: number;
};

/** GET /api/kiosk/cafes/{cafeId}/reservations?phone4= */
export type KioskReservationLookup = { reservations: KioskReservation[] };

/** POST /api/kiosk/cafes/{cafeId}/reservations/{id}/check-in  { phone4 } */
export type KioskCheckInResult = { reservation: KioskReservation };

/** GET /api/kiosk/cafes/{cafeId}/waitlist[?phone4=] */
export type KioskWaitlistStatus = {
  /** 지금 줄에 있는 팀 수 */
  waitingTeams: number;
  /** phone4를 주면 뒷자리가 같은 내 대기 */
  mine: KioskWaitlistEntry[];
};

/** POST /api/kiosk/cafes/{cafeId}/waitlist  { name, phone, partySize } */
export type KioskWaitlistJoinResult = { entry: KioskWaitlistEntry };

/** 4xx 응답. 입력 오류면 fieldErrors에 칸별 문구가 있다. */
export type KioskApiError = {
  message: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};
