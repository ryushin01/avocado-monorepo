"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@avocado/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";

import { changePasswordAction } from "@/app/password/actions";
import { FormErrorAlert } from "@/components/form/form-error-alert";
import type { FormState } from "@/lib/form";

const FIELDS = [
  { name: "current", label: "지금 비밀번호", autoComplete: "current-password" },
  { name: "next", label: "새 비밀번호", autoComplete: "new-password", hint: "8자 이상" },
  { name: "confirm", label: "새 비밀번호 확인", autoComplete: "new-password" },
] as const;

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
            <FieldLabel htmlFor={`password-${f.name}`}>{f.label}</FieldLabel>
            <Input
              id={`password-${f.name}`}
              name={f.name}
              type="password"
              autoComplete={f.autoComplete}
              aria-invalid={Boolean(errors[f.name]?.length)}
            />
            {"hint" in f && <FieldDescription>{f.hint}</FieldDescription>}
            <FieldError errors={errors[f.name]?.map((message) => ({ message }))} />
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
