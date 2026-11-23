import Link from "next/link";
import type { ReactNode } from "react";

import { GAME_CATEGORIES, GAME_CATEGORY_LABELS } from "@avocado/domain/catalog";
import { cn } from "@avocado/ui/lib/utils";

import { MonoLabel, outlineAction } from "@/shared/ui/kiosk-header";
import { type KioskFilter, kioskFilterHref, PLAYER_OPTIONS } from "../model/filter-games";

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "true" : undefined}
      // 손가락으로 누르기 쉽게 높이 48px (터치 권장 크기 44px). 고른 조건은 밝게 채운다.
      className={cn(
        outlineAction,
        "h-12 px-5 text-base aria-[current=true]:border-primary aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/** 왼쪽 고정폭 꼬리표와 외곽선 버튼 줄. 조건은 주소에 남는다. */
function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className="grid items-center gap-3 md:grid-cols-[8rem_1fr]"
    >
      {label ? (
        <MonoLabel>
          {label} <span aria-hidden>►</span>
        </MonoLabel>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** 손으로 누르기 쉬운 큰 필터 버튼. 조건은 주소에 남는다. */
export function FilterChips({ filter }: { filter: KioskFilter }) {
  return (
    <div className="flex flex-col gap-3">
      <Row label="인원">
        <Chip href={kioskFilterHref({ ...filter, players: undefined })} active={!filter.players}>
          전체
        </Chip>
        {PLAYER_OPTIONS.map((n) => (
          <Chip key={n} href={kioskFilterHref({ ...filter, players: n })} active={filter.players === n}>
            {n === 8 ? "8명 이상" : `${n}명`}
          </Chip>
        ))}
      </Row>
      <Row label="유형">
        <Chip href={kioskFilterHref({ ...filter, category: undefined })} active={!filter.category}>
          전체
        </Chip>
        {GAME_CATEGORIES.map((c) => (
          <Chip key={c} href={kioskFilterHref({ ...filter, category: c })} active={filter.category === c}>
            {GAME_CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </Row>
      <Row>
        <Chip
          href={kioskFilterHref({ ...filter, availableOnly: !filter.availableOnly })}
          active={Boolean(filter.availableOnly)}
        >
          지금 이용 가능한 게임만
        </Chip>
      </Row>
    </div>
  );
}
