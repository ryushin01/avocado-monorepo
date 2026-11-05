"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { BRAND } from "@/shared/config/site";

/** 큰 사진(#hero)이 머리글 아래로 지나갔는지 본다. 머리글이 데스크톱 높이(80px)만큼 사진을 가리므로 그만큼 뺀다. */
function usePastHero() {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);
  return past;
}

/** 홈 머리글: 왼쪽 사진 위의 로고와 오른쪽 흰 패널의 메뉴 버튼. 사진을 지나면 흰 바탕으로 바뀐다. */
export function MainHeader({ menu }: { menu: ReactNode }) {
  const past = usePastHero();
  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 grid h-12 grid-cols-2 transition-colors duration-300 motion-reduce:transition-none lg:h-20 lg:grid-cols-6 ${
        past ? "bg-card text-card-foreground" : "text-white"
      }`}
    >
      <Link href="/" className="flex items-center pl-5 text-xl tracking-[8px] lg:col-span-2 lg:pl-[60px] lg:text-3xl">
        <span lang="en">{BRAND.wordmark}</span>
        <span className="sr-only"> 홈</span>
      </Link>
      <div className="flex items-center justify-end lg:col-span-4 lg:rounded-lg lg:border lg:border-page lg:bg-card lg:pr-[60px] lg:text-card-foreground">
        {menu}
      </div>
    </header>
  );
}
