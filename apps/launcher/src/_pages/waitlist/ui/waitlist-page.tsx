import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@avocado/ui/components/skeleton";
import { cn } from "@avocado/ui/lib/utils";

import { ConnectionError } from "@/shared/ui/connection-error";
import { IdleReturn } from "@/shared/ui/idle-return";
import { KIOSK_GUTTER, KioskHeader, KioskTitle } from "@/shared/ui/kiosk-header";
import { WaitlistFlow } from "./waitlist-flow";
import { fetchWaitlist } from "@/shared/api/index.server";

export const metadata: Metadata = { title: "대기 등록" };

export default function WaitlistPage() {
  return (
    <>
      <KioskHeader current="waitlist" />
      <main
        id="main"
        tabIndex={-1}
        className={cn("grid w-full flex-1 content-start gap-10 pt-4 pb-16 outline-none lg:grid-cols-[1fr_1.15fr]", KIOSK_GUTTER)}
      >
        <IdleReturn />
        <div className="flex flex-col gap-8">
          <KioskTitle label="Waitlist" serif="현장" sans="대기" />
          <Suspense fallback={<Skeleton className="h-8 w-64" />}>
            <WaitingTeams />
          </Suspense>
        </div>
        <WaitlistFlow />
      </main>
    </>
  );
}

async function WaitingTeams() {
  const result = await fetchWaitlist();
  if (!result.ok) return <ConnectionError reason={result.reason} />;
  return (
    <p className="text-xl text-muted-foreground tabular-nums">
      지금 <strong className="text-5xl font-normal text-foreground">{result.data.waitingTeams}</strong>팀이 기다리고
      있습니다.
    </p>
  );
}
