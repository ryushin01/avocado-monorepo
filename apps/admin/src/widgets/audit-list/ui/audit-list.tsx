import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@avocado/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import { AUDIT_ACTION_LABELS, type AuditEntry } from "@/entities/audit";
import { formatDateTime } from "@/shared/lib/format";

/** 데스크톱은 표, 모바일은 카드 목록 */
export function AuditList({ entries }: { entries: AuditEntry[] }) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시각</TableHead>
              <TableHead>직원</TableHead>
              <TableHead>작업</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>매장</TableHead>
              <TableHead>내용</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(entry.at)}</TableCell>
                <TableCell>{entry.actorName}</TableCell>
                <TableCell>{AUDIT_ACTION_LABELS[entry.action]}</TableCell>
                <TableCell className="font-medium">{entry.targetName}</TableCell>
                <TableCell>{entry.cafeName ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{entry.detail ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ItemGroup className="gap-2 md:hidden">
        {entries.map((entry) => (
          <Item key={entry.id} variant="outline">
            <ItemContent>
              <ItemTitle>
                {AUDIT_ACTION_LABELS[entry.action]} · {entry.targetName}
              </ItemTitle>
              <ItemDescription>
                {entry.actorName} · {formatDateTime(entry.at)}
                {entry.cafeName && ` · ${entry.cafeName}`}
              </ItemDescription>
              {entry.detail && <ItemDescription>{entry.detail}</ItemDescription>}
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </>
  );
}
