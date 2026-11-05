import { Avatar, AvatarFallback, AvatarImage } from "@avocado/ui/components/avatar";
import { Badge } from "@avocado/ui/components/badge";
import { cn } from "@avocado/ui/lib/utils";
import {
  GAME_CATEGORY_LABELS,
  GAME_DIFFICULTY_LABELS,
  type BoardGame,
} from "../model/types";

export function formatPlayers({ minPlayers, maxPlayers }: BoardGame) {
  return minPlayers === maxPlayers
    ? `${minPlayers}명`
    : `${minPlayers}–${maxPlayers}명`;
}

export function formatPlayTime({ playTimeMin, playTimeMax }: BoardGame) {
  return playTimeMin === playTimeMax
    ? `${playTimeMin}분`
    : `${playTimeMin}–${playTimeMax}분`;
}

/** 인원 · 시간 · 난이도 한 줄 요약 (모바일 목록) */
export function formatGameMeta(game: BoardGame) {
  return `${formatPlayers(game)} · ${formatPlayTime(game)} · ${GAME_DIFFICULTY_LABELS[game.difficulty]}`;
}

export function GameThumbnail({
  game,
  className,
}: {
  game: BoardGame;
  className?: string;
}) {
  const src = game.thumbnailUrl ?? game.imageUrl;
  return (
    // 상자 그림이 원형으로 잘리지 않도록 테두리(after)와 이미지도 둥근 사각형으로 맞춘다.
    <Avatar className={cn("size-10 rounded-md after:rounded-md", className)}>
      {src && (
        <AvatarImage
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="rounded-md object-cover"
        />
      )}
      {/* 불러오는 중이거나 이미지가 없을 때: avocado 목록의 자리표시 카드 + 이름 첫 글자 */}
      <AvatarFallback className="rounded-md bg-[url('/images/game-placeholder.png')] bg-cover bg-center font-medium text-neutral-600">
        {game.name.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}

/** 썸네일 + 한글명 + 영문명 (표의 이름 칸) */
export function GameNameCell({ game }: { game: BoardGame }) {
  return (
    <div className="flex items-center gap-3">
      <GameThumbnail game={game} />
      <div className="min-w-0">
        <div className="font-medium">{game.name}</div>
        {game.englishName && (
          <div className="truncate text-xs text-muted-foreground">
            {game.englishName}
          </div>
        )}
      </div>
    </div>
  );
}

export function GameCategoryBadges({ game }: { game: BoardGame }) {
  return (
    <div className="flex flex-wrap gap-1">
      {game.categories.map((category) => (
        <Badge key={category} variant="outline">
          {GAME_CATEGORY_LABELS[category]}
        </Badge>
      ))}
    </div>
  );
}
