"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@avocado/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";

import { FormErrorAlert } from "@/components/form/form-error-alert";

/** 이메일·비밀번호 로그인. 성공하면 원래 가려던 화면(callbackUrl)으로 간다. */
export function LoginForm({ callbackUrl, initialError }: { callbackUrl: string; initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        redirect: false,
      });
      if (!result || result.error) {
        setError(
          result?.error === "locked"
            ? "로그인을 5번 잘못해 15분 동안 잠겼습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요."
            : "이메일 또는 비밀번호가 맞지 않거나, 사용할 수 없는 계정입니다.",
        );
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormErrorAlert message={error} />
        <Field>
          <FieldLabel htmlFor="login-email">이메일</FieldLabel>
          <Input id="login-email" name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">비밀번호</FieldLabel>
          <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
          로그인
        </Button>
      </FieldGroup>
    </form>
  );
}
