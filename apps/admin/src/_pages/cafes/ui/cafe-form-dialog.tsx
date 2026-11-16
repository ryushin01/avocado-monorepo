"use client";

import type { ReactElement } from "react";

import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { useDialogForm } from "@/shared/lib/use-dialog-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import { FieldGroup } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import type { Cafe } from "@/entities/cafe";
import type { FormState } from "@/shared/lib/form";
import { FormTextField } from "@/shared/ui/form-text-field";
import { DialogFormFooter } from "@/shared/ui/dialog-form-footer";

function toFormValues(cafe?: Cafe) {
  return {
    name: cafe?.name ?? "",
    region: cafe?.region ?? "",
    address: cafe?.address ?? "",
    phone: cafe?.phone ?? "",
    openedAt: cafe?.openedAt ?? "",
  };
}

export function CafeFormDialog({
  title,
  description,
  submitLabel,
  cafe,
  action,
  open,
  onOpenChange,
  trigger,
}: {
  title: string;
  description: string;
  submitLabel: string;
  /** 수정할 매장. 없으면 빈 폼(등록) */
  cafe?: Cafe;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
}) {
  const form = useDialogForm(action, {
    defaults: toFormValues(cafe),
    onSuccess: () => onOpenChange(false),
  });

  const textField = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormTextField formState={form} idPrefix="cafe" name={name} label={label} {...props} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />
            {textField("name", "매장 이름", { placeholder: "예: 강남점" })}
            <div className="grid grid-cols-2 gap-4">
              {textField("region", "지역", { placeholder: "예: 서울" })}
              {textField("openedAt", "개점일", { type: "date" })}
            </div>
            {textField("address", "주소 (선택)")}
            {textField("phone", "전화번호 (선택)", {
              type: "tel",
              inputMode: "tel",
              placeholder: "02-1234-5678",
            })}
          </FieldGroup>

          <DialogFormFooter submitLabel={submitLabel} pending={form.pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
