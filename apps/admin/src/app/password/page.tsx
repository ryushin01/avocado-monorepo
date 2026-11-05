import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@avocado/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@avocado/ui/components/card";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getSignedInUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "비밀번호 변경 · 보드게임 카페 백오피스" };

/** 본인 비밀번호 변경. 임시 비밀번호인 직원은 다른 화면 대신 여기로 온다. */
export default function PasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <Suspense fallback={<Skeleton className="m-6 h-72" />}>
          <PasswordContent />
        </Suspense>
      </Card>
    </main>
  );
}

async function PasswordContent() {
  const user = await getSignedInUser();
  return (
    <>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <KeyRound className="size-5" />
        </div>
        <CardTitle className="text-xl">비밀번호 변경</CardTitle>
        <CardDescription>
          {user.mustChangePassword
            ? `${user.name}님, 관리자가 정한 임시 비밀번호로 로그인했습니다. 계속하려면 본인만 아는 비밀번호로 바꿔주세요.`
            : `${user.name}님의 로그인 비밀번호를 바꿉니다.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChangePasswordForm />
        {!user.mustChangePassword && (
          <Link href="/" className={buttonVariants({ variant: "ghost", className: "self-center" })}>
            취소
          </Link>
        )}
      </CardContent>
    </>
  );
}
