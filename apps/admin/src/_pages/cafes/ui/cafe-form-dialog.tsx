"use client";

import { Fragment, type ReactElement, useState } from "react";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {/* 창을 열 때마다 새로 마운트되어 그때의 값·버전으로 시작한다. */}
        <CafeForm
          title={title}
          description={description}
          submitLabel={submitLabel}
          cafe={cafe}
          action={action}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CafeForm({
  title,
  description,
  submitLabel,
  cafe: latest,
  action,
  onSaved,
}: {
  title: string;
  description: string;
  submitLabel: string;
  cafe?: Cafe;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  onSaved: () => void;
}) {
  // 창을 연 시점의 값. 열려 있는 동안 화면이 다시 받아져도 이 값과 버전을 쓰고,
  // 그사이 다른 직원이 고쳤다면 저장할 때 서버가 버전으로 알아채 덮어쓰지 않는다.
  const [cafe] = useState(latest);
  const form = useDialogForm(action, {
    defaults: toFormValues(cafe),
    onSuccess: onSaved,
  });

  const textField = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormTextField formState={form} idPrefix="cafe" name={name} label={label} {...props} />
  );

  return (
    <form action={form.formAction} noValidate>
      {cafe && <input type="hidden" name="version" value={cafe.version} />}
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <FormErrorAlert message={form.formError} />
        {/* 실패하면 입력 칸만 다시 그려 입력값을 되살린다. 폼 오류 영역과 버튼 줄은 그대로 두어 바뀐 오류가 읽히고 제출 버튼의 초점도 남는다. */}
        <Fragment key={form.formKey}>
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
        </Fragment>
      </FieldGroup>

      <DialogFormFooter submitLabel={submitLabel} pending={form.pending} />
    </form>
  );
}
