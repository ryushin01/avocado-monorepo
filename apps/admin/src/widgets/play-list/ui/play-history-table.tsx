import { GameNameCell } from "@/entities/game/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import { formatDateTime, formatMinutes, formatTime } from "@/shared/lib/format";
import { minutesBetween } from "@/shared/lib/kst-time";
import type { PlayEntry } from "@/entities/play";

export function PlayHistoryTable({ plays }: { plays: PlayEntry[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이용 시작</TableHead>
            <TableHead>게임</TableHead>
            <TableHead className="text-right">인원</TableHead>
            <TableHead>테이블</TableHead>
            <TableHead>반납</TableHead>
            <TableHead className="text-right">이용 시간</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plays.map((play) => (
            <TableRow key={play.id}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatDateTime(play.startedAt)}
              </TableCell>
              <TableCell>
                <GameNameCell game={play.game} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{play.playerCount}명</TableCell>
              <TableCell className="text-muted-foreground">{play.table ?? "–"}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                {formatTime(play.returnedAt!)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMinutes(minutesBetween(play.startedAt, play.returnedAt!))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
