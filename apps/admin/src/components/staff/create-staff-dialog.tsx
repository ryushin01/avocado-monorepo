"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { createUserAction } from "@/app/(backoffice)/staff/actions";
import { StaffFormDialog, type CafeOption } from "@/components/staff/staff-form-dialog";
import { Button } from "@avocado/ui/components/button";

export function CreateStaffDialog({ cafes }: { cafes: CafeOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <StaffFormDialog
      title="직원 등록"
      description="새 직원을 등록합니다. 등록하면 개발용 계정 전환 목록에도 나타납니다."
      submitLabel="등록"
      cafes={cafes}
      action={createUserAction}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <UserPlus />
          직원 등록
        </Button>
      }
    />
  );
}
