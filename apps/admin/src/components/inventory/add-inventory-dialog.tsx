"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import {
  addInventoryAction,
  searchAddableGamesAction,
} from "@/app/(backoffice)/inventory/actions";
import { FormErrorAlert } from "@/components/form/form-error-alert";
import { useDialogForm } from "@/components/form/use-dialog-form";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import type { BoardGame } from "@/lib/games/types";

export function AddInventoryDialog({
  cafeId,
  cafeName,
}: {
  cafeId: string;
  cafeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<BoardGame[] | null>(null);
  const [loading, startLoading] = useTransition();

  const form = useDialogForm(addInventoryAction.bind(null, cafeId), {
    defaults: { gameId: "", quantity: "1" },
    onSuccess: () => setOpen(false),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    // 열 때마다 최신 후보(이 매장에 아직 없는 게임)를 불러온다.
    setGames(null);
    startLoading(async () => setGames(await searchAddableGamesAction(cafeId, "")));
  };

  const selectedId = form.text("gameId");
  const selected = games?.find((g) => g.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus />
        게임 추가
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>재고에 게임 추가</DialogTitle>
            <DialogDescription>
              카탈로그에서 {cafeName}에 아직 없는 게임을 골라 추가합니다. 추가
              직후 상태는 &lsquo;이용 가능&rsquo;입니다.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />
            <Field data-invalid={form.invalid("gameId")}>
              <FieldLabel htmlFor="inventory-game">게임</FieldLabel>
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
                  itemToStringLabel={(game: BoardGame) => game.name}
                  itemToStringValue={(game: BoardGame) => game.id}
                >
                  <ComboboxInput
                    id="inventory-game"
                    placeholder="게임 이름 검색"
                    aria-invalid={form.invalid("gameId")}
                    className="w-full"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>추가할 수 있는 게임이 없습니다.</ComboboxEmpty>
                    <ComboboxList>
                      {(game: BoardGame) => (
                        <ComboboxItem key={game.id} value={game}>
                          {game.name}
                          {game.englishName && (
                            <span className="truncate text-xs text-muted-foreground">
                              {game.englishName}
                            </span>
                          )}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
              <FieldError errors={form.errors("gameId")} />
            </Field>
            <Field data-invalid={form.invalid("quantity")}>
              <FieldLabel htmlFor="inventory-add-quantity">보유 수량</FieldLabel>
              <Input
                id="inventory-add-quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={form.text("quantity")}
                aria-invalid={form.invalid("quantity")}
              />
              <FieldError errors={form.errors("quantity")} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={form.pending || loading}>
              {form.pending && <Loader2 className="animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
