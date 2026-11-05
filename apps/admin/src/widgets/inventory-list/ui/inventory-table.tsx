import {
  formatPlayTime,
  formatPlayers,
  GameCategoryBadges,
  GameNameCell,
} from "@/entities/game/ui";
import { InventoryRowActions } from "@/features/manage-inventory";
import { InUseBadge, InventoryStatusBadge } from "@/entities/inventory/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import { formatUpdatedAt } from "@/shared/lib/format";
import type { InventoryEntry } from "@/entities/inventory";

export function InventoryTable({ entries }: { entries: InventoryEntry[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>인원</TableHead>
            <TableHead>플레이 시간</TableHead>
            <TableHead className="text-right">보유 수량</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>최근 변경</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">작업</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.gameId}>
              <TableCell>
                <GameNameCell game={entry.game} />
              </TableCell>
              <TableCell>
                <GameCategoryBadges game={entry.game} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatPlayers(entry.game)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatPlayTime(entry.game)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {entry.quantity}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <InventoryStatusBadge status={entry.status} />
                  <InUseBadge count={entry.inUse} />
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatUpdatedAt(entry.updatedAt)}
              </TableCell>
              <TableCell>
                <InventoryRowActions entry={entry} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
