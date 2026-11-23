import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@avocado/ui/components/skeleton";
import { cn } from "@avocado/ui/lib/utils";

import { AutoRefresh } from "@/shared/ui/auto-refresh";
import { ConnectionError } from "@/shared/ui/connection-error";
import { IdleReturn } from "@/shared/ui/idle-return";
import { KIOSK_GUTTER, KioskDivider, KioskHeader, MonoLabel } from "@/shared/ui/kiosk-header";
import { fetchCafeGamesOrSnapshot } from "@/shared/api/index.server";
import { OfflineDataNotice } from "@/shared/ui/offline-data-notice";

const LOGO_CREDIT = "Avocado icons created by amonrat rungreangfangsai - Flaticon";
const LOGO_CREDIT_URL = "https://www.flaticon.com/authors/amonrat-rungreangfangsai";

const MENU = [
  {
    href: "/games",
    title: "게임 둘러보기",
    tags: "인원 — 유형 — 이용 현황",
    description: "인원과 유형으로 지금 할 수 있는 게임을 찾아보세요.",
  },
  {
    href: "/reservation",
    title: "예약 확인",
    tags: "뒷자리 — 도착 알림",
    description: "전화번호 뒷자리로 오늘 예약을 확인하고 도착을 알립니다.",
  },
  {
    href: "/waitlist",
    title: "대기 등록",
    tags: "현장 대기 — 내 순서",
    description: "자리가 나면 순서대로 안내해드립니다. 내 순서도 확인할 수 있습니다.",
  },
] as const;

/** 메뉴가 차례로 나타나도록 항목마다 늦추는 시간(.kiosk-settle가 읽는 CSS 변수) */
const MENU_DELAYS = ["[--rise-delay:500ms]", "[--rise-delay:620ms]", "[--rise-delay:740ms]"] as const;

/**
 * 시작 화면: 작은 꼬리표와 소개 문단, 세리프·산세리프를 섞은 큰 제목, 번호가 붙은 메뉴 목록.
 * 키오스크는 이 화면에 오래 머물러서 "지금 바로 이용 가능" 수가 낡지 않게 1분마다 다시 받는다.
 */
export default function HomePage() {
  return (
    <>
      <KioskHeader current="home" />
      <main
        id="main"
        tabIndex={-1}
        className={cn("flex w-full flex-1 flex-col gap-14 pt-6 pb-10 outline-none", KIOSK_GUTTER)}
      >
        <AutoRefresh seconds={60} />
        {/* 시작 화면은 확대된 채 남았을 때만 새로 연다. */}
        <IdleReturn />
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Welcome />
        </Suspense>

        <nav aria-label="메뉴" className="flex flex-col gap-8">
          <KioskDivider />
          <ul className="grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-6 md:grid-cols-3">
            {MENU.map((item, i) => (
              <li key={item.href} className={cn("kiosk-settle", MENU_DELAYS[i])}>
                <MenuItem index={i + 1} {...item} />
              </li>
            ))}
          </ul>
        </nav>

        {/*
          앱 아이콘(Flaticon 아이콘)의 출처 표기. 브라우저로 열면 작가 페이지 링크를 보이고,
          매장 태블릿에 설치한 키오스크 앱(매니페스트 fullscreen, 지원하지 않으면 standalone)에서는
          손님이 키오스크 밖으로 나가지 않게 같은 문구를 글자로만 보인다.
        */}
        <p className="mt-auto text-center font-mono text-xs text-muted-foreground">
          로고 아이콘:{" "}
          <a
            href={LOGO_CREDIT_URL}
            lang="en"
            className="inline-flex min-h-6 items-center underline underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/60 [@media(display-mode:fullscreen)]:hidden [@media(display-mode:standalone)]:hidden"
          >
            {LOGO_CREDIT}
          </a>
          <span lang="en" className="hidden [@media(display-mode:fullscreen)]:inline [@media(display-mode:standalone)]:inline">
            {LOGO_CREDIT}
          </span>
        </p>
      </main>
    </>
  );
}

async function Welcome() {
  const result = await fetchCafeGamesOrSnapshot();
  if (!result.ok) return <ConnectionError reason={result.reason} />;
  const { cafe, games } = result.data;
  const available = games.filter((g) => g.availability === "available").length;
  return (
    <header className="flex flex-col gap-[clamp(2.5rem,7vh,5rem)]">
      <div className="kiosk-settle grid items-start gap-6 [--rise-delay:200ms] md:grid-cols-[1fr_1fr_1.25fr]">
        <MonoLabel>Board game cafe</MonoLabel>
        <MonoLabel>{cafe.name} · Self kiosk</MonoLabel>
        <div className="flex flex-col gap-4">
          {/* 첫 줄을 들여 쓴 회색 소개 문단. 게임 수만 흰색으로 띄운다. */}
          <p className="indent-12 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {cafe.name}에 오신 것을 환영합니다.{" "}
            <span className="text-foreground tabular-nums">
              보유 게임 {games.length}종{!result.offline && ` · 지금 바로 이용 가능 ${available}종`}
            </span>
            . 게임을 찾고, 오늘 예약을 확인하고, 현장 대기를 이 화면에서 바로 할 수 있습니다.
          </p>
          {result.offline && <OfflineDataNotice />}
        </div>
      </div>
      <div className="flex flex-col">
        {/* 큰 세리프 줄은 꾸밈 글자(상호는 머리글에 있음) */}
        <p
          aria-hidden
          lang="en"
          className="kiosk-rise font-serif text-[clamp(3.5rem,8vw,6.5rem)] leading-[1.02] font-light tracking-[-0.01em] uppercase"
        >
          <span className="[--rise-delay:250ms]">Avocado Kiosk</span>
        </p>
        <h1 className="kiosk-rise ml-[clamp(2rem,7vw,6rem)] text-[clamp(3rem,7vw,5.75rem)] leading-[1.08] font-medium tracking-[-0.03em]">
          <span className="[--rise-delay:420ms]">무엇을 도와드릴까요?</span>
        </h1>
      </div>
    </header>
  );
}

function MenuItem({
  index,
  href,
  title,
  tags,
  description,
}: {
  index: number;
  href: string;
  title: string;
  tags: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-3 border-b border-input pt-1 pb-5 outline-none focus-visible:rounded-[5px] focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      <span aria-hidden className="flex items-baseline justify-between gap-3">
        <MonoLabel>Menu /0{index}</MonoLabel>
        <MonoLabel className="text-right">{tags}</MonoLabel>
      </span>
      <span className="flex items-center justify-between gap-4">
        <span className="text-[clamp(1.625rem,2.6vw,2rem)] leading-tight tracking-[-0.01em] transition-opacity duration-300 group-hover:opacity-60">
          {title}
        </span>
        <ArrowRight
          aria-hidden
          strokeWidth={1}
          className="size-7 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
        />
      </span>
      <span className="text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</span>
    </Link>
  );
}
