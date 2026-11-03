import Link from "next/link";

import { GAME_CATEGORIES, GAME_CATEGORY_LABELS } from "@avocado/domain/catalog";
import { buttonVariants } from "@avocado/ui/components/button";

import { type KioskFilter, kioskFilterHref, PLAYER_OPTIONS } from "@/lib/filter-games";

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={buttonVariants({ variant: active ? "default" : "outline", size: "lg" })}
    >
      {children}
    </Link>
  );
}

/** 손으로 누르기 쉬운 큰 필터 버튼. 조건은 주소에 남는다. */
export function FilterChips({ filter }: { filter: KioskFilter }) {
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="인원" className="flex flex-wrap items-center gap-2">
        <span className="w-12 text-sm font-medium text-muted-foreground">인원</span>
        <Chip href={kioskFilterHref({ ...filter, players: undefined })} active={!filter.players}>
          전체
        </Chip>
        {PLAYER_OPTIONS.map((n) => (
          <Chip key={n} href={kioskFilterHref({ ...filter, players: n })} active={filter.players === n}>
            {n === 8 ? "8명 이상" : `${n}명`}
          </Chip>
        ))}
      </div>
      <div role="group" aria-label="유형" className="flex flex-wrap items-center gap-2">
        <span className="w-12 text-sm font-medium text-muted-foreground">유형</span>
        <Chip href={kioskFilterHref({ ...filter, category: undefined })} active={!filter.category}>
          전체
        </Chip>
        {GAME_CATEGORIES.map((c) => (
          <Chip key={c} href={kioskFilterHref({ ...filter, category: c })} active={filter.category === c}>
            {GAME_CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-12" />
        <Chip
          href={kioskFilterHref({ ...filter, availableOnly: !filter.availableOnly })}
          active={Boolean(filter.availableOnly)}
        >
          지금 이용 가능한 게임만
        </Chip>
      </div>
    </div>
  );
}
