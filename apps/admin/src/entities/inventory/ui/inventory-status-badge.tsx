import { Timer } from "lucide-react";

import { Badge } from "@avocado/ui/components/badge";
import { INVENTORY_STATUS_LABELS, type InventoryStatus } from "../model/types";

const STATUS_VARIANT = {
  available: "default",
  maintenance: "secondary",
  retired: "outline",
} as const satisfies Record<InventoryStatus, string>;

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {INVENTORY_STATUS_LABELS[status]}
    </Badge>
  );
}

/** 손님이 이용 중인 박스 수. 없으면 그리지 않는다. */
export function InUseBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="outline" className="tabular-nums">
      <Timer />
      이용 중 {count}
    </Badge>
  );
}
