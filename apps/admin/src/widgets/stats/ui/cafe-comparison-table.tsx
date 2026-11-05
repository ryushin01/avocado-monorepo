import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";

import { buildListHref } from "@/shared/lib/list";
import type { CafeStats } from "@/entities/stats";

import { Delta } from "./delta";
import { formatNumber } from "@/shared/lib/format";
import { Sparkline } from "./sparkline";

/** 관리자용 매장 비교. 추이선은 모든 매장이 같은 세로 축을 써서 크기를 바로 비교할 수 있다. */
export function CafeComparisonTable({ cafes, period }: { cafes: CafeStats[]; period: number }) {
  const max = Math.max(1, ...cafes.flatMap((c) => c.daily));
  return (
    <Table>
      <caption className="sr-only">매장별 이용 비교</caption>
      <TableHeader>
        <TableRow>
          <TableHead>매장</TableHead>
          <TableHead className="text-right">이용</TableHead>
          <TableHead>지난 {period}일 대비</TableHead>
          <TableHead className="text-right">박스당 이용</TableHead>
          <TableHead className="text-right">평균 시간</TableHead>
          <TableHead className="w-48">일별 추이</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cafes.map((cafe) => (
          <TableRow key={cafe.cafeId}>
            <TableCell>
              <Link
                href={buildListHref("/stats", { cafe: cafe.cafeId, period: String(period) })}
                className="font-medium underline-offset-4 hover:underline"
              >
                {cafe.cafeName}
              </Link>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(cafe.plays.current)}회</TableCell>
            <TableCell>
              <Delta current={cafe.plays.current} previous={cafe.plays.previous} upIsGood />
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(cafe.playsPerBox)}회</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {cafe.averageMinutes === null ? "–" : `${formatNumber(cafe.averageMinutes)}분`}
            </TableCell>
            <TableCell>
              <Sparkline current={cafe.daily} max={max} className="h-8 w-44" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
