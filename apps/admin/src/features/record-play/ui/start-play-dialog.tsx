"use client";

import { Loader2, Play } from "lucide-react";
import { useState, useTransition } from "react";

import { listRentableGamesAction, startPlayAction } from "../api/actions";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { useDialogForm } from "@/shared/lib/use-dialog-form";
import { Button } from "@avocado/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@avocado/ui/components/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import { formatPlayers } from "@/entities/game/ui";
import type { RentableGame } from "@/entities/play";
import { DialogFormFooter } from "@/shared/ui/dialog-form-footer";
import { errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";

export function StartPlayDialog({
  cafeId,
  cafeName,
}: {
  cafeId: string;
  cafeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<RentableGame[] | null>(null);
  const [loading, startLoading] = useTransition();

  const form = useDialogForm(startPlayAction.bind(null, cafeId), {
    defaults: { gameId: "", playerCount: "2", table: "" },
    onSuccess: () => setOpen(false),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    // 열 때마다 지금 빌려줄 수 있는 게임을 새로 불러온다.
    setGames(null);
    startLoading(async () => setGames(await listRentableGamesAction(cafeId)));
  };

  const selectedId = form.text("gameId");
  const selected = games?.find((g) => g.game.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Play />
        이용 시작
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>게임 이용 시작</DialogTitle>
            <DialogDescription>
              손님이 가져가는 게임을 기록합니다. {cafeName}에서 지금 빌려줄 수 있는
              게임(이용 가능 상태, 남은 박스 있음)만 고를 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />
            <Field data-invalid={form.invalid("gameId")}>
              <FieldLabel htmlFor="play-game">게임</FieldLabel>
              {games === null || loading ? (
                <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  게임 목록을 불러오는 중…
                </div>
              ) : (
                <Combobox
                  name="gameId"
                  items={games}
                  defaultValue={selected}
                  itemToStringLabel={(item: RentableGame) => item.game.name}
                  itemToStringValue={(item: RentableGame) => item.game.id}
                >
                  <ComboboxInput
                    id="play-game"
                    placeholder="게임 이름 검색"
                    {...fieldA11y("play-game", form.invalid("gameId"))}
                    className="w-full"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>빌려줄 수 있는 게임이 없습니다.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: RentableGame) => (
                        <ComboboxItem key={item.game.id} value={item}>
                          {item.game.name}
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {formatPlayers(item.game)} · 남은 {item.available}개
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
              <FieldError id={errorIdOf("play-game")} errors={form.errors("gameId")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={form.invalid("playerCount")}>
                <FieldLabel htmlFor="play-player-count">인원</FieldLabel>
                <Input
                  id="play-player-count"
                  name="playerCount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={form.text("playerCount")}
                  {...fieldA11y("play-player-count", form.invalid("playerCount"))}
                />
                <FieldError id={errorIdOf("play-player-count")} errors={form.errors("playerCount")} />
              </Field>
              <Field data-invalid={form.invalid("table")}>
                <FieldLabel htmlFor="play-table">테이블 (선택)</FieldLabel>
                <Input
                  id="play-table"
                  name="table"
                  autoComplete="off"
                  placeholder="예: 3번"
                  defaultValue={form.text("table")}
                  {...fieldA11y("play-table", form.invalid("table"))}
                />
                <FieldError id={errorIdOf("play-table")} errors={form.errors("table")} />
              </Field>
            </div>
            <FieldDescription>
              반납하면 이용 시간이 기록되고, 이용 시작 횟수가 인기 순위에 반영됩니다.
            </FieldDescription>
          </FieldGroup>

          <DialogFormFooter submitLabel="이용 시작" pending={form.pending} disabled={loading} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
