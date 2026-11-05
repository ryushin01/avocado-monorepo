import { Badge } from "@avocado/ui/components/badge";

import { RESERVATION_STATUS_LABELS, type ReservationStatus } from "@/lib/reservations/types";
import { WAITLIST_STATUS_LABELS, type WaitlistStatus } from "@/lib/waitlist/types";

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

const WAITLIST_VARIANT = {
  waiting: "outline",
  called: "default",
  seated: "secondary",
  left: "outline",
} as const satisfies Record<WaitlistStatus, string>;

export function WaitlistStatusBadge({ status }: { status: WaitlistStatus }) {
  return <Badge variant={WAITLIST_VARIANT[status]}>{WAITLIST_STATUS_LABELS[status]}</Badge>;
}
