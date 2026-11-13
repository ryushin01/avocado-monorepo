"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@avocado/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";

import { changePasswordAction } from "../api/actions";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import type { FormState } from "@/shared/lib/form";
import { descriptionIdOf, errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";

const FIELDS = [
  { name: "current", label: "지금 비밀번호", autoComplete: "current-password" },
  { name: "next", label: "새 비밀번호", autoComplete: "new-password", hint: "8자 이상" },
  { name: "confirm", label: "새 비밀번호 확인", autoComplete: "new-password" },
] as const;

const idOf = (name: string) => `password-${name}`;

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, { status: "idle" });

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(state.message);
    router.replace("/");
    router.refresh();
  }, [state, router]);

  const errors = state.status === "error" ? state.fieldErrors : {};
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormErrorAlert message={state.status === "error" ? state.formError : undefined} />
        {FIELDS.map((f) => (
          <Field key={f.name} data-invalid={Boolean(errors[f.name]?.length)}>
            <FieldLabel htmlFor={idOf(f.name)}>{f.label}</FieldLabel>
            <Input
              id={idOf(f.name)}
              name={f.name}
              type="password"
              autoComplete={f.autoComplete}
              {...fieldA11y(idOf(f.name), Boolean(errors[f.name]?.length), {
                described: "hint" in f,
              })}
            />
            {"hint" in f && (
              <FieldDescription id={descriptionIdOf(idOf(f.name))}>{f.hint}</FieldDescription>
            )}
            <FieldError
              id={errorIdOf(idOf(f.name))}
              errors={errors[f.name]?.map((message) => ({ message }))}
            />
          </Field>
        ))}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          비밀번호 바꾸기
        </Button>
      </FieldGroup>
    </form>
  );
}
