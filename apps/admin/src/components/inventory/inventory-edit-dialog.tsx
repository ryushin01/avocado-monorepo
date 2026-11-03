"use client";

import { Loader2 } from "lucide-react";

import { editInventoryAction } from "@/app/(backoffice)/inventory/actions";
import { FormErrorAlert } from "@/components/form/form-error-alert";
import { useDialogForm } from "@/components/form/use-dialog-form";
import { Button } from "@avocado/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avocado/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";
import {
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABELS,
  type InventoryEntry,
} from "@/lib/inventory/types";

const STATUS_ITEMS = INVENTORY_STATUSES.map((s) => ({
  value: s,
  label: INVENTORY_STATUS_LABELS[s],
}));

export function InventoryEditDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: InventoryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useDialogForm(
    editInventoryAction.bind(null, entry.cafeId, entry.gameId),
    {
      defaults: { quantity: String(entry.quantity), status: entry.status },
      onSuccess: () => onOpenChange(false),
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>재고 수정</DialogTitle>
            <DialogDescription>
              &lsquo;{entry.game.name}&rsquo;의 보유 수량과 상태를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />
            <Field data-invalid={form.invalid("quantity")}>
              <FieldLabel htmlFor="inventory-quantity">보유 수량</FieldLabel>
              <Input
                id="inventory-quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={form.text("quantity")}
                aria-invalid={form.invalid("quantity")}
              />
              <FieldError errors={form.errors("quantity")} />
            </Field>
            <Field data-invalid={form.invalid("status")}>
              <FieldLabel htmlFor="inventory-status">상태</FieldLabel>
              <Select
                name="status"
                items={STATUS_ITEMS}
                defaultValue={form.text("status")}
              >
                <SelectTrigger id="inventory-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={form.errors("status")} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2 className="animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
