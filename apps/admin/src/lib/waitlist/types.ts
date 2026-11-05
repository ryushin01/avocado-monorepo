/**
 * 현장 대기. 손님이 키오스크에서 등록하고, 직원이 차례로 부른다.
 *
 * waiting(대기 중) → called(호출) → seated(입장)
 *                  ↘ left(이탈) — 호출 후 오지 않거나 손님이 취소
 */
export const WAITLIST_STATUSES = ["waiting", "called", "seated", "left"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  waiting: "대기 중",
  called: "호출함",
  seated: "입장",
  left: "이탈",
};

/** 아직 줄에 있는 상태 */
export const ACTIVE_WAITLIST_STATUSES: readonly WaitlistStatus[] = ["waiting", "called"];

export type WaitlistEntry = {
  id: string;
  cafeId: string;
  /** 그날 그 매장의 대기 번호 (한국 날짜 기준 1부터) */
  number: number;
  name: string;
  /** 숫자만 */
  phone: string;
  partySize: number;
  createdAt: string;
  status: WaitlistStatus;
  calledAt?: string;
  closedAt?: string;
};
