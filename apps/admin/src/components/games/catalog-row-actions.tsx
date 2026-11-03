"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { updateGameAction } from "@/app/(backoffice)/games/actions";
import { GameFormDialog } from "@/components/games/game-form-dialog";
import { Button } from "@avocado/ui/components/button";
import type { BoardGame } from "@/lib/games/types";

/** 카탈로그 게임 수정 (관리자 전용 — 부모가 권한을 확인해 렌더링한다) */
export function CatalogRowActions({ game }: { game: BoardGame }) {
  const [open, setOpen] = useState(false);

  return (
    <GameFormDialog
      title="보드게임 수정"
      description={`'${game.name}'의 공통 정보를 수정합니다. 모든 매장에 반영됩니다.`}
      submitLabel="저장"
      game={game}
      action={updateGameAction.bind(null, game.id)}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`${game.name} 수정`}>
          <Pencil />
        </Button>
      }
    />
  );
}
