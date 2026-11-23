import type { Metadata } from "next";

import { cn } from "@avocado/ui/lib/utils";

import { IdleReturn } from "@/shared/ui/idle-return";
import { KIOSK_GUTTER, KioskHeader, KioskTitle } from "@/shared/ui/kiosk-header";
import { ReservationFlow } from "./reservation-flow";

export const metadata: Metadata = { title: "예약 확인" };

export default function ReservationPage() {
  return (
    <>
      <KioskHeader current="reservation" />
      <main
        id="main"
        tabIndex={-1}
        className={cn("grid w-full flex-1 content-start gap-10 pt-4 pb-16 outline-none lg:grid-cols-[1fr_1.15fr]", KIOSK_GUTTER)}
      >
        <IdleReturn />
        <KioskTitle label="Reservation" serif="예약" sans="확인" />
        <ReservationFlow />
      </main>
    </>
  );
}
