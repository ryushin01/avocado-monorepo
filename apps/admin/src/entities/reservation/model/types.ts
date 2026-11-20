/**
 * 예약. 직원이 전화 등으로 받아 백오피스에 등록하거나, 손님이 홍보 사이트에서 온라인으로 한다.
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

/** 받은 곳: 직원이 등록(전화 등), 손님이 홍보 사이트에서 온라인으로 */
export const RESERVATION_SOURCES = ["staff", "online"] as const;
export type ReservationSource = (typeof RESERVATION_SOURCES)[number];

export const RESERVATION_SOURCE_LABELS: Record<ReservationSource, string> = {
  staff: "직원 등록",
  online: "온라인",
};

/** 테이블을 차지하는 상태(끝나지 않았거나 입장한 예약). 취소·노쇼는 자리를 비운다. */
export const SEATING_RESERVATION_STATUSES: readonly ReservationStatus[] = ["pending", "confirmed", "seated"];

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
  /** 편집 폼의 낙관적 잠금용 행 버전. 바꿀 때마다 새 값을 받는다(db/schema.ts의 version). */
  version: number;
  source: ReservationSource;
  /** 배정한 테이블. 없으면 '배정 안 함'으로 받은 예약 */
  tableId?: string;
  /** 배정한 테이블 이름 (목록에서 함께 읽음) */
  tableLabel?: string;
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
