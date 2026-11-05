import Link from "next/link";

import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { BRAND } from "@/shared/config/site";

export function SiteFooter() {
  return (
    <footer className="rounded-t-lg border border-page bg-card px-5 py-[60px] text-sm tracking-tighter text-card-foreground lg:p-[60px]">
      <nav aria-label="게임 유형 바로가기">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-bold">
          {CATEGORY_INFO.map((c) => (
            <li key={c.key}>
              <Link href={`/games/${c.key}`} className="underline-offset-4 hover:underline">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-10 font-bold">{BRAND.name}</p>
      <p className="mt-2 text-muted-foreground">{BRAND.description}</p>
      <p className="mt-10 text-xs text-muted-foreground">
        게임 정보와 순위는 BoardGameGeek 자료를 바탕으로 합니다.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">© {BRAND.shortName}. All rights reserved.</p>
    </footer>
  );
}
