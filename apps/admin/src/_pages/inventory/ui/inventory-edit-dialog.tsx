"use client";


import { editInventoryAction } from "../api/actions";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { useDialogForm } from "@/shared/lib/use-dialog-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/entities/inventory";
import { DialogFormFooter } from "@/shared/ui/dialog-form-footer";
import { errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";

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
                {...fieldA11y("inventory-quantity", form.invalid("quantity"))}
              />
              <FieldError id={errorIdOf("inventory-quantity")} errors={form.errors("quantity")} />
            </Field>
            <Field data-invalid={form.invalid("status")}>
              <FieldLabel htmlFor="inventory-status">상태</FieldLabel>
              <Select
                name="status"
                items={STATUS_ITEMS}
                defaultValue={form.text("status")}
              >
                <SelectTrigger
                  id="inventory-status"
                  className="w-full"
                  {...fieldA11y("inventory-status", form.invalid("status"))}
                >
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
              <FieldError id={errorIdOf("inventory-status")} errors={form.errors("status")} />
            </Field>
          </FieldGroup>

          <DialogFormFooter submitLabel="저장" pending={form.pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
