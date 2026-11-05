import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@avocado/ui/components/button";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { ConnectionError } from "@/shared/ui/connection-error";
import { IdleReturn } from "@/shared/ui/idle-return";
import { WaitlistFlow } from "@/features/join-waitlist";
import { fetchWaitlist } from "@/shared/api/backoffice";

export const metadata: Metadata = { title: "대기 등록" };

export default function WaitlistPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <IdleReturn />
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg", className: "h-12 self-start px-4 text-base" })}>
        <ArrowLeft />
        처음으로
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">현장 대기</h1>
      <Suspense fallback={<Skeleton className="h-8 w-64" />}>
        <WaitingTeams />
      </Suspense>
      <WaitlistFlow />
    </main>
  );
}

async function WaitingTeams() {
  const result = await fetchWaitlist();
  if (!result.ok) return <ConnectionError reason={result.reason} />;
  return (
    <p className="text-xl tabular-nums">
      지금 <strong className="text-3xl">{result.data.waitingTeams}</strong>팀이 기다리고 있습니다.
    </p>
  );
}
