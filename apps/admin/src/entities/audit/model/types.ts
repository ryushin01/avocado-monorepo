/** 변경 이력에 남기는 관리 작업. 손님 정보가 오가는 예약·대기와 횟수가 많은 이용 기록은 남기지 않는다. */
export const AUDIT_ACTIONS = [
  "inventory.add",
  "inventory.update",
  "inventory.status",
  "inventory.remove",
  "game.create",
  "game.update",
  "cafe.create",
  "cafe.update",
  "cafe.close",
  "cafe.reopen",
  "staff.create",
  "staff.update",
  "staff.deactivate",
  "staff.reactivate",
  "kiosk.issue",
  "kiosk.revoke",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "inventory.add": "재고 추가",
  "inventory.update": "재고 수정",
  "inventory.status": "재고 상태 변경",
  "inventory.remove": "재고 제외",
  "game.create": "게임 등록",
  "game.update": "게임 수정",
  "cafe.create": "매장 등록",
  "cafe.update": "매장 수정",
  "cafe.close": "매장 폐점",
  "cafe.reopen": "매장 운영 재개",
  "staff.create": "직원 등록",
  "staff.update": "직원 수정",
  "staff.deactivate": "직원 퇴사 처리",
  "staff.reactivate": "직원 복직 처리",
  "kiosk.issue": "키오스크 토큰 발급",
  "kiosk.revoke": "키오스크 토큰 폐기",
};

/** 기록할 내용. detail에 비밀번호·토큰 원문·손님 정보를 넣지 않는다. */
export type AuditInput = {
  action: AuditAction;
  /** 작업 대상의 이름 (게임, 매장, 직원, 기기). 대상의 이름이 나중에 바뀌어도 그때 이름을 남긴다. */
  targetName: string;
  /** 관련 매장 */
  cafeId?: string;
  /** 예: 수량 3개 → 5개 */
  detail?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actorId: string;
  /** 작업할 때의 직원 이름 */
  actorName: string;
  action: AuditAction;
  targetName: string;
  cafeId?: string;
  cafeName?: string;
  detail?: string;
};
