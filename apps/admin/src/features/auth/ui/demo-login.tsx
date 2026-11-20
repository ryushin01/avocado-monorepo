"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useSyncExternalStore, useTransition } from "react";

import { Button } from "@avocado/ui/components/button";

import { DEMO_RESET_MINUTES } from "@/shared/config";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";

export type DemoAccount = { email: string; name: string; label: string };

const subscribeNothing = () => () => {};

/**
 * 공개 데모 전용: 시드 계정으로 바로 로그인하는 버튼. 비밀번호를 몰라도 둘러볼 수 있게 한다.
 * 데모가 아닐 때는 로그인 화면이 이 컴포넌트를 그리지 않는다.
 */
export function DemoLogin({ accounts, password, callbackUrl }: { accounts: DemoAccount[]; password: string; callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pendingEmail, setPendingEmail] = useState<string>();
  const [pending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const login = (email: string) => {
    setPendingEmail(email);
    startTransition(async () => {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("데모 계정으로 로그인하지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    });
  };

  return (
    <section aria-labelledby="demo-login-title" className="mt-6 flex flex-col gap-3 border-t pt-6">
      <h2 id="demo-login-title" className="text-sm font-semibold">
        데모 계정으로 둘러보기
      </h2>
      <p className="text-xs text-muted-foreground">
        공개 데모입니다. 매장·직원·손님은 모두 가상 데이터이고, 바꾼 내용은 {DEMO_RESET_MINUTES}분마다 처음 상태로
        돌아갑니다. 버튼을 누르면 바로 들어가며, 직접 입력할 때는 아래 이메일과 비밀번호{" "}
        <span className="font-mono">{password}</span>를 쓰세요.
      </p>
      <FormErrorAlert message={error} />
      {accounts.map((account) => (
        <Button
          key={account.email}
          type="button"
          variant="outline"
          className="h-auto min-h-11 justify-start py-2 text-left"
          disabled={pending || !hydrated}
          onClick={() => login(account.email)}
        >
          {pending && pendingEmail === account.email ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
          <span className="flex flex-col">
            <span>{account.label}로 둘러보기</span>
            <span className="text-xs font-normal text-muted-foreground">
              {account.name} · {account.email}
            </span>
          </span>
        </Button>
      ))}
    </section>
  );
}
