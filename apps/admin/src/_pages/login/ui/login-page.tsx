import type { Metadata } from "next";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  Card,
  CardContent,
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
    <main id="main" tabIndex={-1} className="flex min-h-dvh flex-col px-6 py-5 md:px-12 lg:px-20">
      {/* 레퍼런스의 머리글: 왼쪽 주소 칩, 오른쪽 워드마크 */}
      <div className="flex items-center justify-between gap-4">
        <p lang="en" aria-hidden className="flex flex-wrap gap-4">
          <span className="bo-chip" data-current="">
            <span className="bo-chip__sign w-auto px-2">www</span>
            <span className="bo-chip__label">avocado-admin</span>
          </span>
          <span className="bo-chip max-sm:hidden">
            <span className="bo-chip__sign">/</span>
            <span className="bo-chip__label">login</span>
          </span>
        </p>
        <p className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center border border-foreground bg-background">
            <Image src="/brand/logo.png" alt="" width={32} height={32} unoptimized />
          </span>
          <span lang="en" className="text-[1.75rem] leading-none font-semibold tracking-tight uppercase">
            Avocado
          </span>
        </p>
      </div>

      <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
        <div className="flex flex-col gap-4">
          <p lang="en" aria-hidden className="bo-eyebrow flex flex-wrap items-center gap-4">
            <span className="bo-plate">staff only</span>
            <span>backoffice console</span>
          </p>
          <h1 className="text-[clamp(2.5rem,1.5rem+3.5vw,4.5rem)] leading-[1.05] font-bold tracking-[-0.03em]">
            보드게임 카페 백오피스
          </h1>
          <p className="max-w-md text-lg leading-7 text-muted-foreground">
            직원 계정으로 로그인하세요. 재고·이용 기록·예약을 한 화면에서 관리합니다.
          </p>
        </div>

        <Card className="w-full gap-0 bg-background py-0">
          <CardHeader className="flex h-10 items-center bg-foreground py-0 text-background">
            <CardTitle className="font-mono text-sm font-normal tracking-[0.02em]">/ 로그인</CardTitle>
          </CardHeader>
          <CardContent className="py-5">
            <Suspense fallback={<Skeleton className="h-48" />}>
              <LoginContent searchParams={searchParams} />
            </Suspense>
          </CardContent>
          {process.env.NODE_ENV !== "production" && (
            <CardFooter className="flex-col items-start gap-1 border-t border-border bg-muted py-4 font-mono text-xs text-muted-foreground">
              <p className="font-medium text-foreground">개발용 계정 (비밀번호 {DEV_PASSWORD})</p>
              {SEED_USERS.filter((u) => u.active).map((u) => (
                <p key={u.id} className="tabular-nums">
                  {u.email} · {u.name} ({ROLE_LABELS[u.role]})
                </p>
              ))}
            </CardFooter>
          )}
        </Card>
      </div>

      {/* 파비콘·사이드바 로고(Flaticon 아이콘)의 출처 표기 */}
      <p className="font-mono text-xs text-muted-foreground">
        로고 아이콘:{" "}
        <a
          href="https://www.flaticon.com/authors/amonrat-rungreangfangsai"
          lang="en"
          className="inline-flex min-h-6 items-center underline underline-offset-4 hover:bg-foreground hover:text-background"
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
