"use client";

import { MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setUserActiveAction, updateUserAction } from "@/app/(backoffice)/staff/actions";
import { StaffFormDialog, type CafeOption } from "@/components/staff/staff-form-dialog";
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
import type { User } from "@/lib/auth/roles";

export function StaffRowActions({
  user,
  cafes,
  isSelf,
}: {
  user: User;
  cafes: CafeOption[];
  /** 지금 로그인한 본인 */
  isSelf: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const setActive = (active: boolean) =>
    startTransition(async () => {
      const result = await setUserActiveAction(user.id, active);
      if (result.ok) {
        toast.success(result.message);
        setLeaveOpen(false);
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
              aria-label={`${user.name} 메뉴`}
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
          {user.active ? (
            <DropdownMenuItem
              variant="destructive"
              disabled={isSelf}
              onClick={() => setLeaveOpen(true)}
            >
              <UserX />
              퇴사 처리
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setActive(true)}>
              <UserCheck />
              복직 처리
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <StaffFormDialog
        title="직원 정보 수정"
        description={`'${user.name}'의 정보를 수정합니다.`}
        submitLabel="저장"
        user={user}
        cafes={cafes}
        lockRole={isSelf}
        action={updateUserAction.bind(null, user.id)}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>퇴사 처리할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &lsquo;{user.name}&rsquo;을(를) 퇴사 처리하면 바로 로그인이 막혀
              백오피스를 쓸 수 없습니다. 직원 정보는 남아 있어 다시 복직 처리할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => setActive(false)}
            >
              퇴사 처리
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
