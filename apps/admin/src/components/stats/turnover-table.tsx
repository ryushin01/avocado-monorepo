import { GameNameCell } from "@/components/games/game-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";

import type { GameTurnover } from "@/lib/stats/types";

import { formatNumber } from "./format";

/**
 * 게임 회전율 표. 박스당 이용 횟수를 칸 안의 가로 막대로 함께 보여준다.
 * 막대 길이는 max(같은 화면의 최댓값) 기준이라 두 표를 나란히 비교할 수 있다.
 */
export function TurnoverTable({
  rows,
  max,
  caption,
}: {
  rows: GameTurnover[];
  max: number;
  caption: string;
}) {
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead>게임</TableHead>
          <TableHead className="w-2/5">박스당 이용</TableHead>
          <TableHead className="text-right">이용</TableHead>
          <TableHead className="text-right">박스</TableHead>
          <TableHead className="text-right">평균 시간</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.game.id}>
            <TableCell>
              <GameNameCell game={row.game} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-2 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
                    style={{ width: `${max === 0 ? 0 : (row.playsPerBox / max) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums">{formatNumber(row.playsPerBox)}회</span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.plays}회</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{row.boxes}개</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {row.averageMinutes === null ? "–" : `${formatNumber(row.averageMinutes)}분`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
