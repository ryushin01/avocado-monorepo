"use client";

import { BellRing, DoorOpen, LogOut } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@avocado/ui/components/button";

import { changeWaitlistStatusAction } from "@/app/(backoffice)/reservations/actions";
import { canChangeWaitlist } from "@/lib/waitlist/repository";
import type { WaitlistEntry, WaitlistStatus } from "@/lib/waitlist/types";

/** 대기 한 팀의 버튼: 호출 → 입장, 이탈 */
export function WaitlistActions({ entry }: { entry: WaitlistEntry }) {
  const [pending, startTransition] = useTransition();
  const change = (to: WaitlistStatus) =>
    startTransition(async () => {
      const result = await changeWaitlistStatusAction(entry.cafeId, entry.id, to);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  const label = `대기 ${entry.number}번`;
  return (
    <div className="flex flex-wrap gap-1">
      {canChangeWaitlist(entry.status, "called") && (
        <Button size="sm" disabled={pending} onClick={() => change("called")} aria-label={`${label} 호출`}>
          <BellRing />
          호출
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => change("seated")}
        aria-label={`${label} 입장`}
      >
        <DoorOpen />
        입장
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => change("left")}
        aria-label={`${label} 이탈`}
      >
        <LogOut />
        이탈
      </Button>
    </div>
  );
}
