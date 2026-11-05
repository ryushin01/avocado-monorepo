import { Badge } from "@avocado/ui/components/badge";

import { RESERVATION_STATUS_LABELS, type ReservationStatus } from "../model/types";

const RESERVATION_VARIANT = {
  pending: "outline",
  confirmed: "default",
  seated: "secondary",
  cancelled: "outline",
  no_show: "destructive",
} as const satisfies Record<ReservationStatus, string>;

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge variant={RESERVATION_VARIANT[status]}>{RESERVATION_STATUS_LABELS[status]}</Badge>;
}
