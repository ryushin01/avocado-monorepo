import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND } from "@/shared/config/site";

import { SiteMenu } from "./site-menu";

/**
 * 목록·상세의 왼쪽 패널. 데스크톱에서는 화면 높이로 고정되고, 모바일에서는 위쪽 막대가 된다.
 * 초점 순서가 두 모양에서 같도록 DOM은 로고, 제목, 뒤로, 메뉴 순서다.
 */
export function PageHeader({ title, back }: { title: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="sticky top-0 z-20 w-full rounded-b-lg border border-page bg-card text-card-foreground lg:col-span-2 lg:h-screen lg:rounded-lg">
      <div className="flex flex-wrap items-center lg:content-start lg:gap-y-10 lg:px-8 lg:py-[60px] xl:px-[60px]">
        <Link href="/" className="hidden basis-full text-3xl tracking-[8px] lg:block">
          <span lang="en">{BRAND.wordmark}</span>
          <span className="sr-only"> 홈</span>
        </Link>
        <div
          lang="en"
          className={`order-2 min-w-0 flex-1 truncate text-xl ${back ? "" : "pl-5 lg:pl-0"} tracking-tighter lg:order-none lg:basis-full lg:border-b lg:pb-4 lg:text-4xl`}
        >
          {title}
        </div>
        {/* 모바일에서는 이 묶음을 풀어 뒤로·제목·메뉴를 한 줄에 놓는다. */}
        <div className="contents lg:flex lg:basis-full lg:items-center lg:justify-between lg:gap-2">
          {back && (
            <Link
              href={back.href}
              className="order-1 flex size-12 min-w-0 items-center justify-center gap-2 underline-offset-4 hover:underline lg:size-auto"
            >
              <ArrowLeft className="size-6 shrink-0" />
              <span className="sr-only lg:not-sr-only">{back.label}</span>
            </Link>
          )}
          <div className="order-3 shrink-0 lg:ml-auto">
            <SiteMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
