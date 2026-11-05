"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { createCafeAction } from "../api/actions";
import { CafeFormDialog } from "./cafe-form-dialog";
import { Button } from "@avocado/ui/components/button";

export function CreateCafeDialog() {
  const [open, setOpen] = useState(false);
  return (
    <CafeFormDialog
      title="매장 등록"
      description="새 매장을 등록합니다. 등록한 매장은 바로 운영 중이 되고, 재고 관리에서 게임을 추가할 수 있습니다."
      submitLabel="등록"
      action={createCafeAction}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus />
          매장 등록
        </Button>
      }
    />
  );
}
