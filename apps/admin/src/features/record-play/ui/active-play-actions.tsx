"use client";

import { MoreHorizontal, Undo2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelPlayAction, returnPlayAction } from "../api/actions";
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
  DropdownMenuTrigger,
} from "@avocado/ui/components/dropdown-menu";
import type { ActionResult } from "@/shared/lib/form";
import type { PlayEntry } from "@/entities/play";

/** 이용 중인 기록: 반납 버튼 + (잘못 입력했을 때) 취소 메뉴 */
export function ActivePlayActions({ play }: { play: PlayEntry }) {
  const [cancelOpen, setCancelOpen] = useState(false);
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
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={`${play.game.name} 반납`}
        onClick={() => run(() => returnPlayAction(play.cafeId, play.id))}
      >
        <Undo2 />
        반납
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${play.game.name} 이용 메뉴`}
              disabled={pending}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem variant="destructive" onClick={() => setCancelOpen(true)}>
            <XCircle />
            이용 취소
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이용 기록을 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &lsquo;{play.game.name}&rsquo; 이용 기록을 지웁니다. 잘못 입력했을 때만
              쓰세요. 지운 기록은 인기 순위에도 들어가지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelPlayAction(play.cafeId, play.id, play.game.name),
                  () => setCancelOpen(false),
                )
              }
            >
              기록 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
