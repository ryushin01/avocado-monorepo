import { INVENTORY_STATUS_LABELS, type InventoryStatus } from "@/entities/inventory";

type Snapshot = { quantity: number; status: InventoryStatus };

/** 변경 이력에 적을 문구. 바뀐 값만 적는다. 예: 수량 3개 → 5개, 상태 이용 가능 → 점검 중 */
export function describeInventoryChange(before: Snapshot | null | undefined, after: Snapshot) {
  if (!before) return undefined;
  const changes: string[] = [];
  if (before.quantity !== after.quantity) {
    changes.push(`수량 ${before.quantity}개 → ${after.quantity}개`);
  }
  if (before.status !== after.status) {
    changes.push(
      `상태 ${INVENTORY_STATUS_LABELS[before.status]} → ${INVENTORY_STATUS_LABELS[after.status]}`,
    );
  }
  return changes.length > 0 ? changes.join(", ") : undefined;
}
