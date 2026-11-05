import type { BoardGame } from "@/entities/game/@x/play";

/**
 * 매장에서 게임을 한 번 빌려 간(이용한) 기록.
 * 반납하기 전(returnedAt 없음)에는 '이용 중'이고, 그 박스는 다른 손님에게 빌려줄 수 없다.
 */
export type PlaySession = {
  id: string;
  cafeId: string;
  gameId: string;
  /** 이용 시작 시각. 인기 순위는 이 시각으로 센다. */
  startedAt: string;
  /** 반납 시각. 없으면 이용 중 */
  returnedAt?: string;
  /** 함께 플레이한 인원 */
  playerCount: number;
  /** 테이블 번호 등 손님 자리 (선택) */
  table?: string;
};

export type PlayEntry = PlaySession & { game: BoardGame };

/** 지금 빌려줄 수 있는 게임: 이용 가능 상태이고 남은 박스가 있다. */
export type RentableGame = { game: BoardGame; available: number; quantity: number };

export type PlayHistoryFilter = {
  q?: string;
  /** YYYY-MM-DD (한국 시간 기준 이용 시작일) */
  date?: string;
};

export const POPULARITY_PERIODS = ["week", "month"] as const;
export type PopularityPeriod = (typeof POPULARITY_PERIODS)[number];

export const POPULARITY_PERIOD_DAYS: Record<PopularityPeriod, number> = {
  week: 7,
  month: 30,
};

export const POPULARITY_PERIOD_LABELS: Record<PopularityPeriod, string> = {
  week: "주간",
  month: "월간",
};

export type PopularGame = { rank: number; game: BoardGame; playCount: number };

export type PopularityRanking = {
  period: PopularityPeriod;
  from: string;
  to: string;
  items: PopularGame[];
};

/** 대시보드용 이용 현황 */
export type PlayUsage = {
  /** 지금 이용 중 */
  inUse: number;
  /** 오늘(한국 시간 0시부터) 이용 시작 횟수 */
  today: number;
  /** 최근 7일 이용 시작 횟수 */
  week: number;
};

export type PlayUsageSummary = {
  totals: PlayUsage;
  cafes: ({ cafeId: string } & PlayUsage)[];
};
