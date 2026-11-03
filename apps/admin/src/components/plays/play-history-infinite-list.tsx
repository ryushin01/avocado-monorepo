"use client";

import { useCallback } from "react";

import { fetchPlayHistoryAction } from "@/app/(backoffice)/plays/actions";
import { GameThumbnail } from "@/components/games/game-display";
import { InfiniteList } from "@/components/list/infinite-list";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@avocado/ui/components/item";
import { formatDateTime, formatMinutes, formatPlayMeta } from "@/lib/plays/format";
import { minutesBetween } from "@/lib/plays/time";
import type { PlayEntry, PlayHistoryFilter } from "@/lib/plays/types";

/** 모바일 지난 이용 기록 */
export function PlayHistoryInfiniteList({
  cafeId,
  filter,
  firstPage,
  total,
}: {
  cafeId: string;
  filter: PlayHistoryFilter;
  firstPage: PlayEntry[];
  total: number;
}) {
  const fetchMore = useCallback(
    (offset: number, limit: number) => fetchPlayHistoryAction(cafeId, filter, offset, limit),
    [cafeId, filter],
  );

  return (
    <InfiniteList
      label="지난 이용 기록"
      firstPage={firstPage}
      total={total}
      fetchMore={fetchMore}
      getKey={(play) => play.id}
      renderItem={(play) => (
        <Item variant="outline" data-testid="list-item">
          <ItemMedia>
            <GameThumbnail game={play.game} className="size-12" />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate">{play.game.name}</ItemTitle>
            <ItemDescription>
              {formatPlayMeta(play)} ·{" "}
              {formatMinutes(minutesBetween(play.startedAt, play.returnedAt!))}
            </ItemDescription>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatDateTime(play.startedAt)}
            </p>
          </ItemContent>
        </Item>
      )}
    />
  );
}
