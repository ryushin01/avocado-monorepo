import { CalendarCheck, Dices, ListOrdered } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@avocado/ui/components/card";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { ConnectionError } from "@/shared/ui/connection-error";
import { fetchCafeGames } from "@/shared/api/backoffice";

/** 시작 화면: 매장 이름과 큰 메뉴 버튼 */
export default function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 p-8">
      <Suspense fallback={<Skeleton className="h-24 w-96" />}>
        <Welcome />
      </Suspense>

      <nav aria-label="메뉴" className="grid gap-6 md:grid-cols-3">
        <MenuCard href="/games" icon={Dices} title="게임 둘러보기" description="인원과 유형으로 지금 할 수 있는 게임을 찾아보세요." />
        <MenuCard href="/reservation" icon={CalendarCheck} title="예약 확인" description="전화번호 뒷자리로 오늘 예약을 확인하고 도착을 알립니다." />
        <MenuCard href="/waitlist" icon={ListOrdered} title="대기 등록" description="자리가 나면 순서대로 안내해드립니다. 내 순서도 확인할 수 있습니다." />
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

function MenuCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Dices;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full transition-colors hover:bg-accent">
        <CardHeader className="gap-3 py-6">
          <Icon className="size-10" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
