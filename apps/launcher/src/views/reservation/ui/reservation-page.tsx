import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@avocado/ui/components/button";

import { IdleReturn } from "@/shared/ui/idle-return";
import { ReservationFlow } from "@/features/check-in-reservation";

export const metadata: Metadata = { title: "예약 확인" };

export default function ReservationPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <IdleReturn />
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg", className: "h-12 self-start px-4 text-base" })}>
        <ArrowLeft />
        처음으로
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">예약 확인</h1>
      <ReservationFlow />
    </main>
  );
}
