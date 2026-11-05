import { Users } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@avocado/ui/components/item";

import { ElapsedTime } from "@/entities/play/ui";
import { formatPhone } from "@/entities/guest";
import { formatTime } from "@/shared/lib/format";
import { ACTIVE_WAITLIST_STATUSES, type WaitlistEntry } from "@/entities/waitlist";

import { WaitlistStatusBadge } from "@/entities/waitlist/ui";
import { WaitlistActions } from "@/features/manage-reservation";

/** 지금 줄에 있는 팀(먼저 온 순)과, 오늘 이미 처리한 팀 수 */
export function WaitlistBoard({ entries, now }: { entries: WaitlistEntry[]; now: number }) {
  const active = entries.filter((e) => ACTIVE_WAITLIST_STATUSES.includes(e.status));
  const done = entries.length - active.length;
  return (
    <div className="flex flex-col gap-3">
      {active.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>기다리는 손님이 없습니다</EmptyTitle>
            <EmptyDescription>손님은 키오스크에서 대기를 등록합니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup aria-label="현장 대기" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((entry) => (
            <Item key={entry.id} variant="outline" data-testid="waitlist-entry">
              <ItemMedia>
                <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-xl font-bold tabular-nums">
                  {entry.number}
                </span>
              </ItemMedia>
              <ItemContent className="min-w-0 gap-1">
                <ItemTitle className="flex-wrap">
                  {entry.name} · {entry.partySize}명
                  <WaitlistStatusBadge status={entry.status} />
                </ItemTitle>
                <ItemDescription className="tabular-nums">{formatPhone(entry.phone)}</ItemDescription>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(entry.createdAt)} 등록 · <ElapsedTime since={entry.createdAt} serverNow={now} /> 대기
                  {entry.calledAt && ` · ${formatTime(entry.calledAt)} 호출`}
                </p>
              </ItemContent>
              <ItemActions className="basis-full justify-end">
                <WaitlistActions entry={entry} />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
      {done > 0 && <p className="text-sm text-muted-foreground">오늘 입장·이탈로 끝난 대기 {done}팀</p>}
    </div>
  );
}
