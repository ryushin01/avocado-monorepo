"use client";

import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  changeInventoryStatusAction,
  removeInventoryAction,
} from "@/app/(backoffice)/inventory/actions";
import { InventoryEditDialog } from "@/components/inventory/inventory-edit-dialog";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avocado/ui/components/dropdown-menu";
import type { ActionResult } from "@/lib/form";
import {
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABELS,
  type InventoryEntry,
  type InventoryStatus,
} from "@/lib/inventory/types";

function isInventoryStatus(value: unknown): value is InventoryStatus {
  return (INVENTORY_STATUSES as readonly unknown[]).includes(value);
}

export function InventoryRowActions({ entry }: { entry: InventoryEntry }) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { cafeId, gameId, game } = entry;

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

  const changeStatus = (value: unknown) => {
    if (!isInventoryStatus(value) || value === entry.status) return;
    run(() => changeInventoryStatusAction(cafeId, gameId, value));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${game.name} 메뉴`}
              disabled={pending}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            수량·상태 수정
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* 하위 메뉴는 마우스 호버로 열린 뒤 클릭하면 닫히고, 모바일에서는 옆으로
              펼칠 공간이 부족해서 상태 선택지를 메인 메뉴에 바로 둔다. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <RefreshCw className="size-3.5" />
              상태 변경
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={entry.status}
              onValueChange={changeStatus}
            >
              {INVENTORY_STATUSES.map((status) => (
                <DropdownMenuRadioItem key={status} value={status} closeOnClick>
                  {INVENTORY_STATUS_LABELS[status]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2 />
            재고에서 제외
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InventoryEditDialog
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>재고에서 제외할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &lsquo;{game.name}&rsquo;을(를) 이 매장 재고에서 제외합니다.
              카탈로그와 다른 매장의 재고에는 영향이 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () => removeInventoryAction(cafeId, gameId, game.name),
                  () => setRemoveOpen(false),
                )
              }
            >
              제외
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
