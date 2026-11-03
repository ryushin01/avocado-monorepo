"use client";

import { DoorClosed, DoorOpen, MoreHorizontal, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  closeCafeAction,
  reopenCafeAction,
  updateCafeAction,
} from "@/app/(backoffice)/cafes/actions";
import { CafeFormDialog } from "@/components/cafes/cafe-form-dialog";
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
import type { CafeOverview } from "@/lib/cafes/types";
import type { ActionResult } from "@/lib/form";

export function CafeRowActions({ cafe }: { cafe: CafeOverview }) {
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        onDone?.();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${cafe.name} 메뉴`}
              disabled={pending}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            정보 수정
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {cafe.status === "open" ? (
            <DropdownMenuItem variant="destructive" onClick={() => setCloseOpen(true)}>
              <DoorClosed />
              폐점 처리
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => run(() => reopenCafeAction(cafe.id))}>
              <DoorOpen />
              운영 재개
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CafeFormDialog
        title="매장 정보 수정"
        description={`'${cafe.name}'의 정보를 수정합니다.`}
        submitLabel="저장"
        cafe={cafe}
        action={updateCafeAction.bind(null, cafe.id)}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>폐점 처리할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &lsquo;{cafe.name}&rsquo;을(를) 대시보드 집계와 재고 관리·이용 기록의 매장
              선택에서 뺍니다. 재고와 이용 기록은 지우지 않으며, 언제든 운영을 다시
              시작할 수 있습니다.
              {cafe.staffCount > 0 &&
                ` 소속 스태프 ${cafe.staffCount}명은 다른 매장으로 옮기기 전까지 재고·이용 기록을 볼 수 없습니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => closeCafeAction(cafe.id), () => setCloseOpen(false))}
            >
              폐점 처리
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
