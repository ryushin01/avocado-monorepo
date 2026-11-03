"use client";

import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";

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
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import type { Cafe } from "@/lib/cafes/types";
import type { FormState } from "@/lib/form";

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

  const textField = (
    name: string,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Field data-invalid={form.invalid(name)}>
      <FieldLabel htmlFor={`cafe-${name}`}>{label}</FieldLabel>
      <Input
        id={`cafe-${name}`}
        name={name}
        autoComplete="off"
        defaultValue={form.text(name)}
        aria-invalid={form.invalid(name)}
        {...props}
      />
      <FieldError errors={form.errors(name)} />
    </Field>
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

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
