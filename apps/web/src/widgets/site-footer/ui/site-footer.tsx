import Link from "next/link";

import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { BRAND, SITE_LINKS } from "@/shared/config/site";

const LINK = "inline-flex min-h-11 items-center underline-offset-4 hover:underline";

export function SiteFooter() {
  return (
    <footer className="rounded-t-lg border border-page bg-card px-5 py-[60px] text-sm tracking-tighter text-card-foreground lg:p-[60px]">
      <nav aria-label="게임 유형 바로가기">
        <ul className="flex flex-wrap gap-x-5 font-bold">
          {CATEGORY_INFO.map((c) => (
            <li key={c.key}>
              <Link href={`/games/${c.key}`} className={LINK}>
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="사이트 안내" className="mt-2">
        <ul className="flex flex-wrap gap-x-5">
          {SITE_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={LINK}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-10 font-bold">{BRAND.name}</p>
      <p className="mt-2 text-muted-foreground">{BRAND.description}</p>
      <p className="mt-10 text-xs text-muted-foreground">
        게임 정보와 순위는 BoardGameGeek 자료를 바탕으로 합니다. 포트폴리오용 예시 사이트이며, 매장과 연락처는 가상의 정보입니다.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">© {BRAND.shortName}. All rights reserved.</p>
    </footer>
  );
}
