"use client";

import { useCallback } from "react";

import { fetchInventoryAction, InventoryRowActions } from "@/features/manage-inventory";
import { formatGameMeta, GameCategoryBadges, GameThumbnail } from "@/entities/game/ui";
import { InUseBadge, InventoryStatusBadge } from "@/entities/inventory/ui";
import { InfiniteList } from "@/shared/ui/infinite-list";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@avocado/ui/components/item";
import type { InventoryEntry, InventoryFilter } from "@/entities/inventory";

/** 모바일 재고 목록 */
export function InventoryInfiniteList({
  cafeId,
  filter,
  firstPage,
  total,
}: {
  cafeId: string;
  filter: InventoryFilter;
  firstPage: InventoryEntry[];
  total: number;
}) {
  const fetchMore = useCallback(
    (offset: number, limit: number) =>
      fetchInventoryAction(cafeId, filter, offset, limit),
    [cafeId, filter],
  );

  return (
    <InfiniteList
      label="재고 목록"
      firstPage={firstPage}
      total={total}
      fetchMore={fetchMore}
      getKey={(entry) => entry.gameId}
      renderItem={(entry) => (
        <Item variant="outline" data-testid="list-item">
          <ItemMedia>
            <GameThumbnail game={entry.game} className="size-12" />
          </ItemMedia>
          <ItemContent className="min-w-0 gap-1.5">
            <ItemTitle className="flex-wrap">
              {entry.game.name}
              <InventoryStatusBadge status={entry.status} />
              <InUseBadge count={entry.inUse} />
            </ItemTitle>
            {entry.game.englishName && (
              <ItemDescription className="truncate">
                {entry.game.englishName}
              </ItemDescription>
            )}
            <GameCategoryBadges game={entry.game} />
            <p className="text-xs text-muted-foreground">
              {formatGameMeta(entry.game)} · 보유 {entry.quantity}
            </p>
          </ItemContent>
          <ItemActions className="self-start">
            <InventoryRowActions entry={entry} />
          </ItemActions>
        </Item>
      )}
    />
  );
}
