import { Timer } from "lucide-react";

import { GameThumbnail } from "@/entities/game/ui";
import { ActivePlayActions } from "@/features/record-play";
import { ElapsedTime } from "@/entities/play/ui";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@avocado/ui/components/item";
import { formatPlayMeta } from "@/entities/play";
import { formatTime } from "@/shared/lib/format";
import type { PlayEntry } from "@/entities/play";

/** 지금 이용 중인 게임. now는 서버에서 조회한 시각이고, 경과 시간은 브라우저에서 1분마다 갱신된다. */
export function ActivePlayList({ plays, now }: { plays: PlayEntry[]; now: number }) {
  if (plays.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Timer />
          </EmptyMedia>
          <EmptyTitle>이용 중인 게임이 없습니다</EmptyTitle>
          <EmptyDescription>
            손님이 게임을 가져가면 &lsquo;이용 시작&rsquo;으로 기록하세요.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ItemGroup aria-label="이용 중인 게임" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {plays.map((play) => (
        <Item key={play.id} variant="outline" data-testid="active-play">
          <ItemMedia>
            <GameThumbnail game={play.game} className="size-12" />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate">{play.game.name}</ItemTitle>
            <ItemDescription>{formatPlayMeta(play)}</ItemDescription>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatTime(play.startedAt)} 시작 ·{" "}
              <ElapsedTime since={play.startedAt} serverNow={now} />
            </p>
          </ItemContent>
          <ItemActions>
            <ActivePlayActions play={play} />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
