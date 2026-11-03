"use client";

import { useCallback } from "react";

import { fetchCatalogAction } from "@/app/(backoffice)/games/actions";
import { CatalogRowActions } from "@/components/games/catalog-row-actions";
import { formatHolding } from "@/components/games/catalog-table";
import {
  formatGameMeta,
  GameCategoryBadges,
  GameThumbnail,
} from "@/components/games/game-display";
import { InfiniteList } from "@/components/list/infinite-list";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@avocado/ui/components/item";
import type { CatalogEntry, GameListFilter } from "@/lib/games/types";

/** 모바일 카탈로그 목록 */
export function CatalogInfiniteList({
  filter,
  firstPage,
  total,
  canEdit,
}: {
  filter: GameListFilter;
  firstPage: CatalogEntry[];
  total: number;
  canEdit: boolean;
}) {
  const fetchMore = useCallback(
    (offset: number, limit: number) => fetchCatalogAction(filter, offset, limit),
    [filter],
  );

  return (
    <InfiniteList
      label="보드게임 목록"
      firstPage={firstPage}
      total={total}
      fetchMore={fetchMore}
      getKey={(game) => game.id}
      renderItem={(game) => (
        <Item variant="outline" data-testid="list-item">
          <ItemMedia>
            <GameThumbnail game={game} className="size-12" />
          </ItemMedia>
          <ItemContent className="min-w-0 gap-1.5">
            <ItemTitle>{game.name}</ItemTitle>
            {game.englishName && (
              <ItemDescription className="truncate">
                {game.englishName}
              </ItemDescription>
            )}
            <GameCategoryBadges game={game} />
            <p className="text-xs text-muted-foreground">
              {formatGameMeta(game)} · {formatHolding(game)}
            </p>
          </ItemContent>
          {canEdit && (
            <ItemActions className="self-start">
              <CatalogRowActions game={game} />
            </ItemActions>
          )}
        </Item>
      )}
    />
  );
}
