import { Dices } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { LoginForm } from "@/components/auth/login-form";
import { DEV_PASSWORD, SEED_USERS } from "@/lib/auth/mock-users";
import { authOptions } from "@/lib/auth/options";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { firstParam } from "@/lib/games/schema";

export const metadata: Metadata = { title: "로그인 · 보드게임 카페 백오피스" };

const ERRORS: Record<string, string> = {
  inactive: "퇴사 처리됐거나 사용할 수 없는 계정입니다. 관리자에게 문의해주세요.",
  CredentialsSignin: "이메일 또는 비밀번호가 맞지 않습니다.",
  locked: "로그인을 5번 잘못해 15분 동안 잠겼습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dices className="size-5" />
          </div>
          <CardTitle className="text-xl">보드게임 카페 백오피스</CardTitle>
          <CardDescription>직원 계정으로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-48" />}>
            <LoginContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
        {process.env.NODE_ENV !== "production" && (
          <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">개발용 계정 (비밀번호 {DEV_PASSWORD})</p>
            {SEED_USERS.filter((u) => u.active).map((u) => (
              <p key={u.id} className="tabular-nums">
                {u.email} · {u.name} ({ROLE_LABELS[u.role]})
              </p>
            ))}
          </CardFooter>
        )}
      </Card>
    </main>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  await connection();
  const [params, session] = await Promise.all([searchParams, getServerSession(authOptions)]);
  const error = firstParam(params.error);
  // 이미 로그인했으면 바로 들어간다 (퇴사 등으로 막힌 경우는 안내를 보여준다).
  if (session && error !== "inactive") redirect("/");
  // 같은 사이트 안의 경로로만 돌아간다.
  const callback = firstParam(params.callbackUrl);
  const callbackUrl = callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/";
  return <LoginForm callbackUrl={callbackUrl} initialError={error ? (ERRORS[error] ?? ERRORS.CredentialsSignin) : undefined} />;
}
