"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@avocado/ui/components/button";
import { DialogClose, DialogFooter } from "@avocado/ui/components/dialog";

/** 폼 대화상자의 아래 버튼: 취소와 제출. 처리 중에는 제출을 막고(초점은 유지) 도는 아이콘을 보인다. */
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
      {/* 처리 중에도 초점을 잃지 않게 막는다(aria-disabled). 누른 버튼이 막히며 초점이 사라지면 키보드·화면 낭독기
          사용자가 위치를 잃는다. 막힌 동안의 누름(Enter로 제출 포함)은 Base UI가 무시해 두 번 보내지 않는다. */}
      <Button type="submit" disabled={pending || disabled} focusableWhenDisabled>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}
