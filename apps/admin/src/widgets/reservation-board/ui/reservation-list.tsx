import { CalendarX, MapPinCheck } from "lucide-react";

import { Badge } from "@avocado/ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@avocado/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";

import { formatPhone } from "@/entities/guest";
import { formatTime } from "@/shared/lib/format";
import type { Reservation } from "@/entities/reservation";

import { ReservationRowActions } from "@/features/manage-reservation";
import { ReservationStatusBadge } from "@/entities/reservation/ui";

function Arrived({ reservation }: { reservation: Reservation }) {
  if (!reservation.arrivedAt || !["pending", "confirmed"].includes(reservation.status)) return null;
  return (
    <Badge variant="secondary">
      <MapPinCheck />
      {formatTime(reservation.arrivedAt)} 도착
    </Badge>
  );
}

/** 하루치 예약. 데스크톱은 표, 모바일은 카드 */
export function ReservationList({ reservations, date }: { reservations: Reservation[]; date: string }) {
  if (reservations.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX />
          </EmptyMedia>
          <EmptyTitle>예약이 없습니다</EmptyTitle>
          <EmptyDescription>&lsquo;예약 등록&rsquo;으로 전화 예약을 기록하세요.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시각</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead className="text-right">인원</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-36">
                <span className="sr-only">작업</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => (
              <TableRow key={r.id} data-testid="reservation-row">
                <TableCell className="font-medium tabular-nums">{formatTime(r.startsAt)}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{formatPhone(r.phone)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.partySize}명</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <ReservationStatusBadge status={r.status} />
                    <Arrived reservation={r} />
                  </div>
                </TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">{r.memo ?? ""}</TableCell>
                <TableCell>
                  <ReservationRowActions reservation={r} date={date} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ItemGroup aria-label="예약 목록" className="gap-2 md:hidden">
        {reservations.map((r) => (
          <Item key={r.id} variant="outline">
            <ItemContent className="min-w-0 gap-1">
              <ItemTitle className="flex-wrap">
                <span className="tabular-nums">{formatTime(r.startsAt)}</span> {r.name}
                <ReservationStatusBadge status={r.status} />
                <Arrived reservation={r} />
              </ItemTitle>
              <ItemDescription>
                {r.partySize}명 · {formatPhone(r.phone)}
                {r.memo && ` · ${r.memo}`}
              </ItemDescription>
            </ItemContent>
            <ItemActions className="self-start">
              <ReservationRowActions reservation={r} date={date} />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </>
  );
}
