"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@avocado/ui/components/button";
import { DialogClose, DialogFooter } from "@avocado/ui/components/dialog";

/** 폼 대화상자의 아래 버튼: 취소와 제출. 처리 중에는 제출을 막고 도는 아이콘을 보인다. */
export function DialogFormFooter({
  submitLabel,
  pending,
  disabled = false,
}: {
  submitLabel: string;
  pending: boolean;
  /** 처리 중이 아니어도 제출을 막을 때(예: 고를 목록을 불러오는 중) */
  disabled?: boolean;
}) {
  return (
    <DialogFooter>
      <DialogClose render={<Button type="button" variant="outline" />}>취소</DialogClose>
      <Button type="submit" disabled={pending || disabled}>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}
