import { Wrench } from "lucide-react";
import Link from "next/link";

import { GameThumbnail } from "@/entities/game/ui";
import { formatUpdatedAt } from "@/shared/lib/format";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@avocado/ui/components/item";
import type { InventorySummary } from "@/entities/inventory";
import { buildListHref } from "@/shared/lib/list";

/** 최근 점검 중으로 바뀐 게임 */
export function MaintenanceList({
  entries,
  showCafe,
}: {
  entries: InventorySummary["maintenance"];
  showCafe: boolean;
}) {
  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Wrench />
          </EmptyMedia>
          <EmptyTitle>점검 중인 게임이 없습니다</EmptyTitle>
          <EmptyDescription>모든 게임을 이용할 수 있습니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ItemGroup className="gap-1" aria-label="점검 중인 게임">
      {entries.map((entry) => (
        <Item
          key={`${entry.cafeId}:${entry.gameId}`}
          size="sm"
          render={
            <Link
              href={buildListHref("/inventory", {
                cafe: entry.cafeId,
                q: entry.game.name,
              })}
            />
          }
        >
          <ItemMedia>
            <GameThumbnail game={entry.game} className="size-8" />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate">{entry.game.name}</ItemTitle>
            <ItemDescription>
              {showCafe && `${entry.cafe.name} · `}
              {formatUpdatedAt(entry.updatedAt)} 변경
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
