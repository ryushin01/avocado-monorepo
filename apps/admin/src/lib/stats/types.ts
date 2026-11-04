import type { BoardGame } from "@/lib/games/types";

/** 통계 기간(일). 4주 단위까지만 두어 요일이 고르게 들어가고, 지난 기간과 비교할 수 있게 한다. */
export const STAT_PERIODS = [7, 14, 28] as const;
export type StatPeriod = (typeof STAT_PERIODS)[number];
export const DEFAULT_STAT_PERIOD: StatPeriod = 28;

/** 히트맵의 요일 순서 (월요일부터). 값은 Date.getUTCDay() 기준 */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

/** 지금 기간·지난 기간 한 쌍 */
export type Compared = { current: number; previous: number };

export type DailyPoint = {
  /** 이번 기간의 날짜 (YYYY-MM-DD, 한국 날짜) */
  date: string;
  current: number;
  /** 지난 기간에서 같은 순서의 날 */
  previous: number;
};

export type StatsKpis = {
  /** 이용 시작 횟수 */
  plays: Compared;
  /** 하루 평균 이용 횟수 */
  dailyAverage: Compared;
  /** 반납한 기록의 평균 이용 시간(분). 기록이 없으면 null */
  averageMinutes: { current: number | null; previous: number | null };
  /** 평균 인원. 기록이 없으면 null */
  averagePlayers: { current: number | null; previous: number | null };
};

export type HeatmapCell = { weekday: number; hour: number; count: number };

export type GameTurnover = {
  game: BoardGame;
  /** 범위 안 매장들의 보유 박스 (폐기 제외) */
  boxes: number;
  plays: number;
  /** 박스 하나가 기간 동안 이용된 횟수 */
  playsPerBox: number;
  averageMinutes: number | null;
};

export type CafeStats = {
  cafeId: string;
  cafeName: string;
  plays: Compared;
  averageMinutes: number | null;
  playsPerBox: number;
  /** 이번 기간 일별 이용 횟수 (작은 추이선) */
  daily: number[];
};

export type StatsSummary = {
  period: StatPeriod;
  /** 이번 기간 [from, to) — 어제까지의 온전한 날만 센다 */
  current: { from: string; to: string };
  previous: { from: string; to: string };
  kpis: StatsKpis;
  daily: DailyPoint[];
  heatmap: { hours: number[]; cells: HeatmapCell[]; max: number };
  /** 박스당 이용 횟수 순 (많은 순). 보유한 게임 전부 */
  turnover: GameTurnover[];
  /** 매장별 비교 (범위 안 매장 순서대로) */
  cafes: CafeStats[];
};
