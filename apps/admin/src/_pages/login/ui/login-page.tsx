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

import { DemoLogin, LoginForm, type DemoAccount } from "@/features/auth";
import { DEV_PASSWORD, SEED_USERS } from "@/server/auth/mock-users";
import { authOptions } from "@/server/auth/options";
import { ROLE_LABELS } from "@/entities/user";
import { isDemoMode } from "@/shared/config";
import { firstParam } from "@/shared/lib/search-params";

export const metadata: Metadata = { title: "로그인 · 보드게임 카페 백오피스" };

const ERRORS: Record<string, string> = {
  inactive: "퇴사 처리됐거나 사용할 수 없는 계정입니다. 관리자에게 문의해주세요.",
  CredentialsSignin: "이메일 또는 비밀번호가 맞지 않습니다.",
  locked: "로그인을 5번 잘못해 15분 동안 잠겼습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
};

// 공개 데모의 바로 로그인 버튼: 본사 관리자와 강남점(데모 키오스크 매장) 스태프
const DEMO_LABELS: Record<string, string> = { u_admin: "본사 관리자", u_staff_gangnam: "강남점 스태프" };
const DEMO_ACCOUNTS: DemoAccount[] = SEED_USERS.flatMap((u) =>
  DEMO_LABELS[u.id] ? [{ email: u.email, name: u.name, label: DEMO_LABELS[u.id] }] : [],
);

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dices className="size-5" />
          </div>
          <CardTitle className="text-xl">
            <h1>보드게임 카페 백오피스</h1>
          </CardTitle>
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
      {/* 파비콘·사이드바 로고(Flaticon 아이콘)의 출처 표기 */}
      <p className="text-center text-xs text-muted-foreground">
        로고 아이콘:{" "}
        <a
          href="https://www.flaticon.com/authors/amonrat-rungreangfangsai"
          lang="en"
          className="inline-flex min-h-6 items-center underline underline-offset-4"
        >
          Avocado icons created by amonrat rungreangfangsai - Flaticon
        </a>
      </p>
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
  const form = <LoginForm callbackUrl={callbackUrl} initialError={error ? (ERRORS[error] ?? ERRORS.CredentialsSignin) : undefined} />;
  if (!isDemoMode()) return form;
  return (
    <>
      {form}
      <DemoLogin accounts={DEMO_ACCOUNTS} password={DEV_PASSWORD} callbackUrl={callbackUrl} />
    </>
  );
}
