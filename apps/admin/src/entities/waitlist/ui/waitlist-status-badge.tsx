import { Badge } from "@avocado/ui/components/badge";

import { WAITLIST_STATUS_LABELS, type WaitlistStatus } from "../model/types";

const WAITLIST_VARIANT = {
  waiting: "outline",
  called: "default",
  seated: "secondary",
  left: "outline",
} as const satisfies Record<WaitlistStatus, string>;

export function WaitlistStatusBadge({ status }: { status: WaitlistStatus }) {
  return <Badge variant={WAITLIST_VARIANT[status]}>{WAITLIST_STATUS_LABELS[status]}</Badge>;
}
