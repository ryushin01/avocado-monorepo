import { Suspense } from "react";

import { Skeleton } from "@avocado/ui/components/skeleton";

import { PageHeader } from "@/widgets/site-header";
import { BRAND } from "@/shared/config";
import { pageMetadata } from "@/shared/lib/page-metadata";

import { BookingSteps } from "./booking-steps";

export const metadata = pageMetadata({
  title: "온라인 예약",
  description: `${BRAND.name} 매장 방문을 온라인으로 예약하세요. 매장·날짜·인원을 고르면 빈 시간을 보여 드립니다.`,
  path: "/reservation",
});

export default function ReservationPage({ searchParams }: PageProps<"/reservation">) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <PageHeader title="RESERVATION" back={{ href: "/", label: "홈으로" }} />
      <main id="main" tabIndex={-1} className="min-w-0 scroll-mt-14 lg:col-span-6 lg:scroll-mt-0">
        <div className="flex flex-col gap-12 rounded-lg border border-page bg-card px-5 py-10 text-card-foreground lg:px-[60px] lg:py-[100px]">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold text-balance md:text-4xl">온라인 예약</h1>
            <p className="max-w-2xl tracking-tighter text-muted-foreground">
              매장·날짜·인원을 고르면 빈 시간을 보여 드립니다. 예약하면 빈 테이블을 바로 배정해 확정해 드리고, 2시간 동안
              자리를 맡아 둡니다.
            </p>
          </div>
          {/* 선택지와 빈 시각은 요청마다 받으므로 이 부분만 요청 때 그린다. */}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <BookingSteps searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
