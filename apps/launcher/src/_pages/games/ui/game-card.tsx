import Image from "next/image";

import { GAME_DIFFICULTY_LABELS } from "@avocado/domain/catalog";
import type { KioskGame } from "@avocado/domain/kiosk";
import { Card, CardContent } from "@avocado/ui/components/card";
import { cn } from "@avocado/ui/lib/utils";

import { AvailabilityBadge } from "./availability-badge";

const range = (min: number, max: number, unit: string) =>
  min === max ? `${min}${unit}` : `${min}–${max}${unit}`;

export function GameCard({ game }: { game: KioskGame }) {
  return (
    <Card data-testid="kiosk-game">
      <CardContent className="flex gap-4">
        {/* 지금 빌릴 수 없는 게임은 표지만 흐리게 한다. 카드 전체를 흐리게 하면 글자의 명도 대비가 4.5:1 아래로 떨어진다. */}
        <div
          className={cn(
            "relative size-24 shrink-0 overflow-hidden rounded-lg bg-[url('/images/game-placeholder.png')] bg-cover bg-center",
            game.availability !== "available" && "opacity-70",
          )}
        >
          {game.thumbnailUrl && (
            // 백오피스가 이미 작은 썸네일로 주므로 다시 최적화하지 않는다.
            <Image src={game.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="truncate text-lg font-semibold">{game.name}</h2>
          {game.englishName && (
            <p className="truncate text-sm text-muted-foreground">{game.englishName}</p>
          )}
          <p className="text-sm">
            {range(game.minPlayers, game.maxPlayers, "명")} ·{" "}
            {range(game.playTimeMin, game.playTimeMax, "분")} · {GAME_DIFFICULTY_LABELS[game.difficulty]}
          </p>
          <div>
            <AvailabilityBadge game={game} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
