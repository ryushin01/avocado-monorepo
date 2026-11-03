import { CalendarCheck, Dices, ListOrdered } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@avocado/ui/components/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@avocado/ui/components/card";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { ConnectionError } from "@/components/connection-error";
import { fetchCafeGames } from "@/lib/backoffice";

/** 시작 화면: 매장 이름과 큰 메뉴 버튼 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 p-8">
      <Suspense fallback={<Skeleton className="h-24 w-96" />}>
        <Welcome />
      </Suspense>

      <nav aria-label="메뉴" className="grid gap-6 md:grid-cols-3">
        <Link href="/games" className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader className="gap-3 py-6">
              <Dices className="size-10" />
              <CardTitle className="text-2xl">게임 둘러보기</CardTitle>
              <CardDescription className="text-base">
                인원과 유형으로 지금 할 수 있는 게임을 찾아보세요.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <ComingSoon icon={CalendarCheck} title="예약 확인" description="예약하신 이름이나 전화번호로 확인합니다." />
        <ComingSoon icon={ListOrdered} title="대기 등록" description="자리가 나면 순서대로 안내해드립니다." />
      </nav>
    </main>
  );
}

async function Welcome() {
  const result = await fetchCafeGames();
  if (!result.ok) return <ConnectionError reason={result.reason} />;
  const { cafe, games } = result.data;
  const available = games.filter((g) => g.availability === "available").length;
  return (
    <header className="flex flex-col gap-2">
      <p className="text-lg text-muted-foreground">{cafe.name}에 오신 것을 환영합니다</p>
      <h1 className="text-5xl font-bold tracking-tight">무엇을 도와드릴까요?</h1>
      <p className="text-lg text-muted-foreground tabular-nums">
        보유 게임 {games.length}종 · 지금 바로 이용 가능 {available}종
      </p>
    </header>
  );
}

function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Dices;
  title: string;
  description: string;
}) {
  return (
    <Card aria-disabled className="opacity-60">
      <CardHeader className="gap-3 py-6">
        <Icon className="size-10" />
        <CardTitle className="flex items-center gap-2 text-2xl">
          {title}
          <Badge variant="secondary">준비 중</Badge>
        </CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
