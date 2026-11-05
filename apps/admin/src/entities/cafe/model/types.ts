export const CAFE_STATUSES = ["open", "closed"] as const;
export type CafeStatus = (typeof CAFE_STATUSES)[number];

export const CAFE_STATUS_LABELS: Record<CafeStatus, string> = {
  open: "운영 중",
  closed: "폐점",
};

/**
 * 프랜차이즈 매장.
 * 폐점한 매장도 지우지 않는다. 재고·이용 기록은 남기고, 대시보드 집계와 매장 선택에서만 뺀다.
 */
export type Cafe = {
  id: string;
  name: string;
  region: string;
  address?: string;
  phone?: string;
  /** YYYY-MM-DD */
  openedAt: string;
  status: CafeStatus;
  /** 폐점 처리한 시각 */
  closedAt?: string;
};

/** 매장 관리 화면에서 함께 보여주는 수치 */
export type CafeOverview = Cafe & {
  /** 보유 게임 종류 수 */
  gameCount: number;
  /** 재직 중인 소속 스태프 수 */
  staffCount: number;
  /** 지금 이용 중인 게임 수 */
  inUseCount: number;
};
