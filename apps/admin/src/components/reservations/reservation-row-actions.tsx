"use client";

import { Check, DoorOpen, MoreHorizontal, Pencil, UserX, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@avocado/ui/components/alert-dialog";
import { Button } from "@avocado/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avocado/ui/components/dropdown-menu";

import { changeReservationStatusAction } from "@/app/(backoffice)/reservations/actions";
import { canChangeReservation } from "@/lib/reservations/repository";
import type { Reservation, ReservationStatus } from "@/lib/reservations/types";

import { ReservationFormDialog } from "./reservation-form-dialog";

const CONFIRM: Partial<Record<ReservationStatus, { title: string; body: string; label: string }>> = {
  cancelled: { title: "예약을 취소할까요?", body: "취소한 예약은 다시 되돌릴 수 없습니다.", label: "예약 취소" },
  no_show: { title: "노쇼로 처리할까요?", body: "예약 시각이 지나도록 오지 않은 손님으로 기록합니다.", label: "노쇼 처리" },
};

/** 입장은 가장 자주 쓰므로 버튼으로, 나머지는 메뉴에 둔다. 끝난 예약에는 아무 작업도 없다. */
export function ReservationRowActions({ reservation, date }: { reservation: Reservation; date: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState<ReservationStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const { cafeId, id, status, name } = reservation;
  const can = (to: ReservationStatus) => canChangeReservation(status, to);
  if (!can("seated")) return null;

  const change = (to: ReservationStatus) =>
    startTransition(async () => {
      const result = await changeReservationStatusAction(cafeId, id, to);
      if (result.ok) {
        toast.success(result.message);
        setConfirming(null);
      } else {
        toast.error(result.message);
      }
    });
  const confirm = confirming ? CONFIRM[confirming] : undefined;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => change("seated")} aria-label={`${name} 입장`}>
        <DoorOpen />
        입장
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`${name} 예약 메뉴`} disabled={pending} />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            수정
          </DropdownMenuItem>
          {can("confirmed") && (
            <DropdownMenuItem onClick={() => change("confirmed")}>
              <Check />
              확정
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirming("no_show")}>
            <UserX />
            노쇼
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming("cancelled")}>
            <XCircle />
            예약 취소
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReservationFormDialog
        cafeId={cafeId}
        reservation={reservation}
        date={date}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              &lsquo;{name}&rsquo; {confirm?.body}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => confirming && change(confirming)}
            >
              {confirm?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
