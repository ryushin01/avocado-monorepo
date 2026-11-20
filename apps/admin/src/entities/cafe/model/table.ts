/** 테이블 한 개의 최대 좌석 수 */
export const TABLE_SEATS_MAX = 12;

/**
 * 매장의 테이블. 예약은 테이블 하나에 배정한다(entities/reservation의 seating 규칙).
 * 쓰지 않게 된 테이블은 지우지 않고 끈다. 지난 예약이 그 테이블을 가리킬 수 있기 때문이다.
 */
export type CafeTable = {
  id: string;
  cafeId: string;
  /** 매장 안에서 부르는 이름 (예: A1, 창가 2) */
  label: string;
  seats: number;
  active: boolean;
};
