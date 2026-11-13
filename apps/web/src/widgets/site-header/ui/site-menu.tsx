"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@avocado/ui/components/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@avocado/ui/components/sheet";

import { BRAND, SITE_LINKS } from "@/shared/config/site";

import { useMenuCategories } from "./site-menu-provider";

/** 위에서 내려오는 메뉴. 초점 가두기, Esc 닫기, 초점 복귀는 Sheet가 맡는다. */
export function SiteMenu() {
  const categories = useMenuCategories();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            aria-label="메뉴 열기"
            className="size-12 text-inherit lg:size-16"
          />
        }
      >
        <Menu className="size-6 lg:size-8" />
      </SheetTrigger>
      <SheetContent
        side="top"
        showCloseButton={false}
        className="gap-0 overflow-y-auto border-0 bg-page duration-300 motion-reduce:transition-none data-[side=top]:h-dvh data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full"
      >
        <SheetTitle className="sr-only">사이트 메뉴</SheetTitle>
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-b-lg border-b border-page bg-card pr-1 pl-5 text-card-foreground lg:pr-[60px] lg:pl-[60px]">
          <Link href="/" onClick={close} className="text-xl tracking-[8px] lg:text-3xl">
            <Image src="/brand/logo.png" alt={`${BRAND.wordmark} 홈`} width={40} height={40} className="size-8 lg:size-10" />
          </Link>
          <Button
            variant="ghost"
            aria-label="메뉴 닫기"
            onClick={close}
            className="size-12 text-inherit lg:size-20"
          >
            <X className="size-6 lg:size-8" />
          </Button>
        </div>
        <MenuLinks
          label="게임 유형"
          links={categories.map(({ key, label }) => ({ href: `/games/${key}`, label }))}
          onNavigate={close}
        />
        <MenuLinks label="사이트 안내" links={SITE_LINKS} onNavigate={close} />
        <div className="relative h-[100px] shrink-0 overflow-hidden rounded-lg lg:h-[200px]">
          <Image src="/images/banners/strategy.webp" alt="" fill sizes="100vw" className="object-cover" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** 메뉴 판 안의 링크 묶음. 묶음마다 이름(aria-label)이 다른 nav 랜드마크다. */
function MenuLinks({
  label,
  links,
  onNavigate,
}: {
  label: string;
  links: readonly { href: string; label: string }[];
  onNavigate: () => void;
}) {
  return (
    <nav aria-label={label} className="rounded-lg border-y border-page bg-card px-5 py-3.5 text-card-foreground lg:px-[60px] lg:py-10">
      <ul>
        {links.map((link) => (
          <li key={link.href} className="border-b last:border-b-0">
            <Link href={link.href} onClick={onNavigate} className="flex h-14 items-center justify-between text-base font-bold underline-offset-4 hover:underline lg:h-20 lg:text-xl">
              {link.label}
              <ArrowRight className="size-4 lg:size-6" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
