"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { createGameAction } from "../api/actions";
import { GameFormDialog } from "./game-form-dialog";
import { Button } from "@avocado/ui/components/button";

export function CreateGameDialog() {
  const [open, setOpen] = useState(false);

  return (
    <GameFormDialog
      title="보드게임 등록"
      description="모든 매장이 함께 쓰는 카탈로그에 게임을 등록합니다. 매장 보유 여부는 재고 관리에서 추가합니다."
      submitLabel="등록"
      action={createGameAction}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus />
          게임 등록
        </Button>
      }
    />
  );
}
