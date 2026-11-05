import Link from "next/link";

import { CafeRowActions } from "@/features/manage-cafe";
import { Badge } from "@avocado/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@avocado/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import { CAFE_STATUS_LABELS, type CafeOverview } from "@/entities/cafe";
import { buildListHref } from "@/shared/lib/list";

function CafeStatusBadge({ cafe }: { cafe: CafeOverview }) {
  return (
    <Badge variant={cafe.status === "open" ? "default" : "outline"}>
      {CAFE_STATUS_LABELS[cafe.status]}
    </Badge>
  );
}

function CafeName({ cafe }: { cafe: CafeOverview }) {
  // 운영 중인 매장만 재고 관리에서 고를 수 있다.
  return cafe.status === "open" ? (
    <Link
      href={buildListHref("/inventory", { cafe: cafe.id })}
      className="font-medium underline-offset-4 hover:underline"
    >
      {cafe.name}
    </Link>
  ) : (
    <span className="font-medium text-muted-foreground">{cafe.name}</span>
  );
}

/** 데스크톱은 표, 모바일은 카드 목록. 매장 수가 많지 않아 한 번에 보여준다. */
export function CafeList({ cafes }: { cafes: CafeOverview[] }) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>매장</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>주소</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead>개점일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">보유 게임</TableHead>
              <TableHead className="text-right">스태프</TableHead>
              <TableHead className="text-right">이용 중</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">작업</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cafes.map((cafe) => (
              <TableRow key={cafe.id}>
                <TableCell>
                  <CafeName cafe={cafe} />
                </TableCell>
                <TableCell>{cafe.region}</TableCell>
                <TableCell className="text-muted-foreground">{cafe.address ?? "–"}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {cafe.phone ?? "–"}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{cafe.openedAt}</TableCell>
                <TableCell>
                  <CafeStatusBadge cafe={cafe} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{cafe.gameCount}종</TableCell>
                <TableCell className="text-right tabular-nums">{cafe.staffCount}명</TableCell>
                <TableCell className="text-right tabular-nums">{cafe.inUseCount}건</TableCell>
                <TableCell>
                  <CafeRowActions cafe={cafe} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ItemGroup aria-label="매장 목록" className="gap-2 md:hidden">
        {cafes.map((cafe) => (
          <Item key={cafe.id} variant="outline" data-testid="cafe-item">
            <ItemContent className="min-w-0 gap-1">
              <ItemTitle className="flex-wrap">
                <CafeName cafe={cafe} />
                <CafeStatusBadge cafe={cafe} />
              </ItemTitle>
              <ItemDescription>
                {[cafe.region, cafe.address, cafe.phone].filter(Boolean).join(" · ")}
              </ItemDescription>
              <p className="text-xs text-muted-foreground tabular-nums">
                {cafe.openedAt} 개점 · 게임 {cafe.gameCount}종 · 스태프 {cafe.staffCount}명 ·
                이용 중 {cafe.inUseCount}건
              </p>
            </ItemContent>
            <ItemActions className="self-start">
              <CafeRowActions cafe={cafe} />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </>
  );
}
