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
