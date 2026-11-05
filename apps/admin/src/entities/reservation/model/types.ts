/**
 * 예약. 직원이 전화 등으로 받아 백오피스에 등록한다.
 *
 * pending(가예약) → confirmed(확정) → seated(입장)
 *                 ↘ cancelled(취소) / no_show(노쇼)
 */
export const RESERVATION_STATUSES = ["pending", "confirmed", "seated", "cancelled", "no_show"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "가예약",
  confirmed: "확정",
  seated: "입장",
  cancelled: "취소",
  no_show: "노쇼",
};

/** 아직 처리할 일이 남은 상태 (끝난 예약은 바꾸지 않는다) */
export const OPEN_RESERVATION_STATUSES: readonly ReservationStatus[] = ["pending", "confirmed"];

export type Reservation = {
  id: string;
  cafeId: string;
  name: string;
  /** 숫자만 (예: 01012345678) */
  phone: string;
  partySize: number;
  /** 방문 예정 시각 */
  startsAt: string;
  memo?: string;
  status: ReservationStatus;
  createdAt: string;
  /** 손님이 키오스크에서 도착을 알린 시각 */
  arrivedAt?: string;
  /** 입장·취소·노쇼로 바뀐 시각 */
  closedAt?: string;
};

/** 상태별로 바꿀 수 있는 다음 상태 */
const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending: ["confirmed", "seated", "cancelled", "no_show"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: [],
  cancelled: [],
  no_show: [],
};

export const canChangeReservation = (from: ReservationStatus, to: ReservationStatus) =>
  TRANSITIONS[from].includes(to);
