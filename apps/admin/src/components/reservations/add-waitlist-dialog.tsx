"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

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

import { addWaitlistAction } from "@/app/(backoffice)/reservations/actions";
import { FormErrorAlert } from "@/components/form/form-error-alert";
import { useDialogForm } from "@/components/form/use-dialog-form";

/** 카운터에서 직원이 대신 대기를 등록할 때 (보통은 손님이 키오스크에서 등록) */
export function AddWaitlistDialog({ cafeId }: { cafeId: string }) {
  const [open, setOpen] = useState(false);
  const form = useDialogForm(addWaitlistAction.bind(null, cafeId), {
    defaults: { name: "", phone: "", partySize: "2" },
    onSuccess: () => setOpen(false),
  });
  const field = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={form.invalid(name)}>
      <FieldLabel htmlFor={`waitlist-${name}`}>{label}</FieldLabel>
      <Input
        id={`waitlist-${name}`}
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus />
        대기 등록
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>현장 대기 등록</DialogTitle>
            <DialogDescription>카운터에서 직접 받은 대기를 등록합니다. 번호는 오늘 순서대로 매겨집니다.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />
            <div className="grid grid-cols-2 gap-4">
              {field("name", "이름")}
              {field("partySize", "인원", { type: "number", inputMode: "numeric", min: 1 })}
            </div>
            {field("phone", "휴대전화", { type: "tel", inputMode: "tel", placeholder: "010-1234-5678" })}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>취소</DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2 className="animate-spin" />}
              등록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
