import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@avocado/ui/lib/utils";

export type KioskSection = "home" | "games" | "reservation" | "waitlist";

const NAV: { section: Exclude<KioskSection, "home">; href: string; label: string }[] = [
  { section: "games", href: "/games", label: "게임 둘러보기" },
  { section: "reservation", href: "/reservation", label: "예약 확인" },
];

/** 화면 가장자리 여백. 머리글과 본문이 같은 세로선에 맞도록 함께 쓴다. */
export const KIOSK_GUTTER = "px-[clamp(1.5rem,6.25vw,5.75rem)]";

/** 머리글 글자 링크: 손가락으로 누르기 쉽게 높이 44px을 확보한다. */
const navLink =
  "relative inline-flex min-h-11 items-center px-2 whitespace-nowrap text-[0.9375rem] text-foreground outline-none transition-opacity duration-300 hover:opacity-60 focus-visible:rounded-[5px] focus-visible:ring-3 focus-visible:ring-ring/60";

const rightRow = "flex items-center justify-end gap-[clamp(0.5rem,2.75vw,4.5rem)]";

/** 외곽선 버튼: 테두리만 있다가 누르거나 올리면 밝게 채운다. 지금 화면이면(aria-current) 채운 채로 둔다. */
export const outlineAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[5px] whitespace-nowrap border border-input px-7 text-[0.9375rem] text-foreground outline-none transition-colors duration-300 hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/60 aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";

/** shadcn Button(outline)에 덧씌우는 키오스크 외곽선 모양. 어두운 테마의 반투명 바탕을 지우고 누르면 밝게 채운다. */
export const kioskOutlineButton =
  "rounded-[5px] border-input bg-transparent font-normal transition-colors duration-300 hover:bg-primary hover:text-primary-foreground dark:border-input dark:bg-transparent dark:hover:bg-primary";

/** shadcn Button(default)에 덧씌우는 키오스크 채운 버튼 모양. */
export const kioskSolidButton = "rounded-[5px] font-normal transition-colors duration-300";

/**
 * 모든 화면 위의 머리글: 왼쪽 가로줄과 세리프 상호, 가운데 로고, 오른쪽 메뉴.
 * 시작 화면은 본문이 곧 메뉴이므로 오른쪽에 메뉴 링크 대신 짧은 소개만 둔다(같은 이름의 링크가 겹치지 않게).
 */
export function KioskHeader({ current }: { current: KioskSection }) {
  const isHome = current === "home";
  const brand = (
    <>
      <span aria-hidden className="h-px w-8 bg-foreground/70" />
      <span className="font-serif text-lg tracking-[0.04em] uppercase" lang="en">
        Avocado
      </span>
    </>
  );
  return (
    <header className={cn("kiosk-settle grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-7", KIOSK_GUTTER)}>
      {isHome ? (
        <p className="flex min-h-11 items-center gap-3">{brand}</p>
      ) : (
        <Link href="/" className={cn(navLink, "gap-3 justify-self-start px-0")}>
          {brand}
        </Link>
      )}
      {/* 앱 아이콘과 같은 로고. 상호는 왼쪽 글자가 알려 주므로 꾸밈으로 둔다. */}
      <Image src="/icon-192.png" alt="" width={36} height={36} unoptimized className="size-9" />
      {isHome ? (
        <div className={rightRow}>
          <span className="text-[0.9375rem]">보드게임 카페</span>
          <span className="text-[0.9375rem]">
            셀프 키오스크
            <sup aria-hidden className="ml-0.5 font-mono text-[0.5625rem] text-muted-foreground">
              03
            </sup>
          </span>
        </div>
      ) : (
        <nav aria-label="화면 이동" className={rightRow}>
          <Link href="/" className={navLink}>
            처음으로
          </Link>
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current === item.section ? "page" : undefined}
              className={cn(navLink, "aria-[current=page]:underline aria-[current=page]:underline-offset-8")}
            >
              {item.label}
              <sup aria-hidden className="absolute top-1.5 -right-2 font-mono text-[0.5625rem] text-muted-foreground">
                0{i + 1}
              </sup>
            </Link>
          ))}
          <Link href="/waitlist" aria-current={current === "waitlist" ? "page" : undefined} className={outlineAction}>
            대기 등록
          </Link>
        </nav>
      )}
    </header>
  );
}

/** 회색 고정폭 대문자 꼬리표(레퍼런스의 작은 라벨). */
export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-xs leading-snug tracking-[0.02em] text-muted-foreground uppercase", className)}>
      {children}
    </span>
  );
}

/**
 * 화면 제목: 앞 낱말은 가는 세리프 대문자, 뒤 낱말은 산세리프. 화면 낭독기에는 "앞 뒤" 한 줄로 읽힌다.
 * label은 제목 위 왼쪽의 고정폭 꼬리표.
 */
export function KioskTitle({ label, serif, sans }: { label: string; serif: string; sans: string }) {
  return (
    <div className="flex flex-col gap-5">
      <MonoLabel>
        {label} <span aria-hidden>►</span>
      </MonoLabel>
      <h1 className="kiosk-rise text-[clamp(2.75rem,6vw,4.25rem)] leading-[1.05] tracking-[-0.02em]">
        <span>
          <span className="font-serif font-light uppercase">{serif}</span>{" "}
          <span className="font-medium">{sans}</span>
        </span>
      </h1>
    </div>
  );
}

/** 양 끝에 작은 삼각형이 달린 가는 구분선(꾸밈). */
export function KioskDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative h-px bg-input",
        "before:absolute before:top-[-3px] before:left-0 before:border-y-[3.5px] before:border-l-[6px] before:border-y-transparent before:border-l-input",
        "after:absolute after:top-[-3px] after:right-0 after:border-y-[3.5px] after:border-r-[6px] after:border-y-transparent after:border-r-input",
        className,
      )}
    />
  );
}
