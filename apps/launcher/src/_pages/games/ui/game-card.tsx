import Image from "next/image";

import { GAME_DIFFICULTY_LABELS } from "@avocado/domain/catalog";
import type { KioskGame } from "@avocado/domain/kiosk";
import { cn } from "@avocado/ui/lib/utils";

import { MonoLabel } from "@/shared/ui/kiosk-header";
import { AvailabilityBadge } from "./availability-badge";

const range = (min: number, max: number, unit: string) =>
  min === max ? `${min}${unit}` : `${min}–${max}${unit}`;

/**
 * 레퍼런스의 작업 목록처럼 둥근 표지, 고정폭 번호·정보 줄, 큰 이름, 아래 가는 선으로 된 게임 카드.
 * showAvailability: 오프라인 스냅숏처럼 이용 현황을 모를 때는 끄고 상태 배지를 숨긴다.
 */
export function GameCard({
  game,
  index,
  showAvailability = true,
}: {
  game: KioskGame;
  /** 목록에서의 순서(1부터). 'GAME /01'처럼 꾸밈 번호로 보인다. */
  index?: number;
  showAvailability?: boolean;
}) {
  return (
    <article data-testid="kiosk-game" className="flex h-full gap-5 border-b border-input pb-5">
      {/* 지금 빌릴 수 없는 게임은 표지만 흐리게 한다. 카드 전체를 흐리게 하면 글자의 명도 대비가 4.5:1 아래로 떨어진다. */}
      <div
        className={cn(
          "relative size-28 shrink-0 overflow-hidden rounded-[8px] bg-[url('/images/game-placeholder.png')] bg-cover bg-center",
          game.availability !== "available" && "opacity-50 grayscale",
        )}
      >
        {game.thumbnailUrl && (
          // 백오피스가 이미 작은 썸네일로 주므로 다시 최적화하지 않는다.
          <Image src={game.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex items-baseline justify-between gap-3">
          {index !== undefined && <MonoLabel>Game /{String(index).padStart(2, "0")}</MonoLabel>}
          <MonoLabel className="ml-auto text-right">
            {range(game.minPlayers, game.maxPlayers, "명")} — {range(game.playTimeMin, game.playTimeMax, "분")} —{" "}
            {GAME_DIFFICULTY_LABELS[game.difficulty]}
          </MonoLabel>
        </p>
        <h2 className="truncate text-[1.625rem] leading-tight tracking-[-0.01em]">{game.name}</h2>
        {game.englishName && (
          <p lang="en" className="truncate font-serif text-base text-muted-foreground uppercase">
            {game.englishName}
          </p>
        )}
        {showAvailability && (
          <div className="mt-auto">
            <AvailabilityBadge game={game} />
          </div>
        )}
      </div>
    </article>
  );
}
