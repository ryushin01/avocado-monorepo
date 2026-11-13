"use client";

import type { ComponentProps } from "react";

import { errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";
import type { DialogForm } from "@/shared/lib/use-dialog-form";
import { Field, FieldError, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";

type FormTextFieldProps = ComponentProps<typeof Input> & {
  /** useDialogForm의 상태. (input의 form 속성과 겹치지 않게 이름을 달리한다) */
  formState: Pick<DialogForm, "text" | "invalid" | "errors">;
  /** 같은 화면의 다른 폼과 id가 겹치지 않게 붙인다. 예) "cafe" → cafe-name */
  idPrefix: string;
  name: string;
  label: string;
};

/** 대화상자 폼의 글자 입력 칸. 라벨·입력·오류 문구를 잇고, 서버가 돌려준 값과 오류를 채운다. */
export function FormTextField({
  formState: form,
  idPrefix,
  name,
  label,
  ...props
}: FormTextFieldProps) {
  const id = `${idPrefix}-${name}`;
  const invalid = form.invalid(name);
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        autoComplete="off"
        defaultValue={form.text(name)}
        {...fieldA11y(id, invalid)}
        {...props}
      />
      <FieldError id={errorIdOf(id)} errors={form.errors(name)} />
    </Field>
  );
}
