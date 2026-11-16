import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@avocado/ui/components/button";

import { PageHeading } from "@/widgets/app-shell";
import { ListEmpty, ListSkeleton } from "@/shared/ui/list-empty";
import { ListToolbar } from "@/features/filter-list";
import { AddWaitlistDialog } from "./add-waitlist-dialog";
import { CreateReservationButton } from "./create-reservation-button";
import { ReservationList } from "./reservation-list";
import { WaitlistBoard } from "./waitlist-board";
import { formatShortDate, formatTime } from "@/shared/lib/format";
import { getCurrentUser } from "@/server/auth/current-user";
import { resolveCafe, visibleCafes } from "@/entities/user";
import { listCafes } from "@/server/cafes/data";
import { firstParam } from "@/shared/lib/search-params";
import { buildListHref } from "@/shared/lib/list";
import { DAY, kstDayRange, toKstDate } from "@/shared/lib/kst-time";
import { listReservations, listWaitlistToday } from "@/server/reservations/data";
import { OPEN_RESERVATION_STATUSES, type Reservation } from "@/entities/reservation";
import { parseReservationDate } from "@/entities/reservation/index.server";
import { ACTIVE_WAITLIST_STATUSES } from "@/entities/waitlist";

import { LiveUpdates } from "./live-updates";

export default function ReservationsPage({ searchParams }: PageProps<"/reservations">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="reservations" title="예약·대기" />
          <ListSkeleton />
        </>
      }
    >
      <ReservationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReservationsContent({ searchParams }: Pick<PageProps<"/reservations">, "searchParams">) {
  const params = await searchParams;
  const [user, cafes] = await Promise.all([getCurrentUser(), listCafes()]);
  // 스태프는 cafe 파라미터와 관계없이 소속 매장만 본다.
  const cafe = resolveCafe(user, cafes, firstParam(params.cafe));
  if (!cafe) {
    return (
      <>
        <PageHeading icon="reservations" title="예약·대기" />
        <ListEmpty title="관리할 매장이 없습니다" description="소속 매장이 없거나 폐점했습니다. 관리자에게 문의해주세요." />
      </>
    );
  }

  const waitlist = await listWaitlistToday(cafe.id);
  const today = toKstDate(waitlist.now);
  const date = parseReservationDate(params) ?? today;
  const reservations = await listReservations(cafe.id, date);

  const cafeParam = user.role === "admin" ? cafe.id : undefined;
  const dayHref = (offset: number) =>
    buildListHref("/reservations", {
      cafe: cafeParam,
      date: toKstDate(kstDayRange(date).from + offset * DAY),
    });
  const activeWaits = waitlist.entries.filter((e) => ACTIVE_WAITLIST_STATUSES.includes(e.status));
  const isOpen = (r: Reservation) => OPEN_RESERVATION_STATUSES.includes(r.status);
  const openReservations = reservations.filter(isOpen);
  // 키오스크 도착 알림은 오늘 예약에만 오므로, 다른 날짜를 보고 있어도 오늘 예약으로 알린다.
  const todaysOpen = date === today ? openReservations : (await listReservations(cafe.id, today)).filter(isOpen);
  const arrivals = todaysOpen.filter((r) => r.arrivedAt);

  return (
    <>
      <PageHeading
        icon="reservations"
        title={`예약·대기 · ${cafe.name}`}
        description="키오스크에서 등록한 현장 대기와 전화 예약을 함께 관리합니다."
        actions={
          // 15초마다 다시 받는 사이 보이는 매장이 바뀌면(폐점 등) 열린 등록 창과 입력을 새 매장으로 넘기지 않고 닫는다.
          <div key={cafe.id} className="flex flex-wrap gap-2">
            <AddWaitlistDialog cafeId={cafe.id} />
            <CreateReservationButton cafeId={cafe.id} date={date < today ? today : date} />
          </div>
        }
      />
      {user.role === "admin" && (
        <ListToolbar
          key={`cafe:${cafe.id}`}
          action="/reservations"
          values={{ cafe: cafe.id }}
          cafes={visibleCafes(user, cafes).map((c) => ({ value: c.id, label: c.name }))}
          hidden={{ date: date === today ? undefined : date }}
          showSearch={false}
          showCategory={false}
        />
      )}

      <LiveUpdates
        // 알림 기준(이미 본 대기·도착)은 매장 단위다. 날짜를 바꿔도 오늘의 대기·도착을 이어서 센다.
        key={cafe.id}
        waiting={activeWaits.map((e) => ({ id: e.id, label: `${e.number}번 ${e.name}` }))}
        arrived={arrivals.map((r) => ({ id: r.id, label: `${formatTime(r.startsAt)} 예약 ${r.name}` }))}
      />

      <section aria-labelledby="waitlist-heading" className="flex flex-col gap-3">
        <h2 id="waitlist-heading" className="text-lg font-semibold">
          현장 대기 <span className="text-muted-foreground tabular-nums">{activeWaits.length}팀</span>
        </h2>
        <WaitlistBoard entries={waitlist.entries} now={waitlist.now} />
      </section>

      <section aria-labelledby="reservations-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="reservations-heading" className="text-lg font-semibold">
            예약 · {formatShortDate(date)}
            {date === today && " (오늘)"}
          </h2>
          <nav aria-label="날짜 이동" className="flex items-center gap-1">
            <Link href={dayHref(-1)} className={buttonVariants({ variant: "outline", size: "icon-sm" })} aria-label="전날">
              <ChevronLeft />
            </Link>
            {date !== today && (
              <Link
                href={buildListHref("/reservations", { cafe: cafeParam })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                오늘
              </Link>
            )}
            <Link href={dayHref(1)} className={buttonVariants({ variant: "outline", size: "icon-sm" })} aria-label="다음날">
              <ChevronRight />
            </Link>
          </nav>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          예약 {reservations.length}건 · 남은 예약 {openReservations.length}건(
          {openReservations.reduce((sum, r) => sum + r.partySize, 0)}명)
        </p>
        <ReservationList reservations={reservations} date={date} />
      </section>
    </>
  );
}
