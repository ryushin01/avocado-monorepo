import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import type { CafeInventoryStats } from "@/entities/inventory";
import { buildListHref } from "@/shared/lib/list";
import type { PlayUsageSummary } from "@/entities/play";

/** 관리자용: 매장별 재고·이용 현황 */
export function CafeSummaryTable({
  cafes,
  usage,
}: {
  cafes: CafeInventoryStats[];
  usage: PlayUsageSummary["cafes"];
}) {
  const usageOf = new Map(usage.map((u) => [u.cafeId, u]));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>매장</TableHead>
          <TableHead className="text-right">보유 게임</TableHead>
          <TableHead className="text-right">보유 박스</TableHead>
          <TableHead className="text-right">점검 중</TableHead>
          <TableHead className="text-right">폐기</TableHead>
          <TableHead className="text-right">지금 이용 중</TableHead>
          <TableHead className="text-right">오늘 이용</TableHead>
          <TableHead className="text-right">최근 7일 이용</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cafes.map(({ cafe, ...stats }) => {
          const plays = usageOf.get(cafe.id) ?? { inUse: 0, today: 0, week: 0 };
          return (
            <TableRow key={cafe.id}>
              <TableCell>
                <Link
                  href={buildListHref("/inventory", { cafe: cafe.id })}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {cafe.name}
                </Link>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {cafe.region}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {stats.gameCount}종
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {stats.boxCount}개
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {stats.maintenanceCount > 0 ? (
                  <Link
                    href={buildListHref("/inventory", {
                      cafe: cafe.id,
                      status: "maintenance",
                    })}
                    className="underline-offset-4 hover:underline"
                  >
                    {stats.maintenanceCount}종
                  </Link>
                ) : (
                  <span className="text-muted-foreground">0종</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {stats.retiredCount}종
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Link
                  href={buildListHref("/plays", { cafe: cafe.id })}
                  className="underline-offset-4 hover:underline"
                >
                  {plays.inUse}건
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">{plays.today}회</TableCell>
              <TableCell className="text-right tabular-nums">{plays.week}회</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
