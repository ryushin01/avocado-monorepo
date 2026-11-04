import { Tooltip, TooltipContent, TooltipTrigger } from "@avocado/ui/components/tooltip";
import { cn } from "@avocado/ui/lib/utils";

import type { HeatmapCell } from "@/lib/stats/types";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/stats/types";

const STEPS = 6;
const STEP_CLASS = [
  "bg-muted",
  "bg-[var(--heat-1)]",
  "bg-[var(--heat-2)]",
  "bg-[var(--heat-3)]",
  "bg-[var(--heat-4)]",
  "bg-[var(--heat-5)]",
  "bg-[var(--heat-6)]",
];

/** 0이면 0(빈칸), 아니면 최댓값 대비 1~6단계 */
const stepOf = (count: number, max: number) =>
  count === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((count / max) * STEPS));

/**
 * 요일 × 시간대 이용 시작 횟수. 한 색(파랑)의 진하기로 많고 적음을 보여준다.
 * 칸에 마우스를 올리거나 초점을 주면 정확한 횟수가 보이고, 화면 낭독기는 아래 표를 읽는다.
 */
export function UsageHeatmap({
  hours,
  cells,
  max,
}: {
  hours: number[];
  cells: HeatmapCell[];
  max: number;
}) {
  const countOf = (weekday: number, hour: number) =>
    cells.find((c) => c.weekday === weekday && c.hour === hour)?.count ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[560px] gap-0.5"
          style={{ gridTemplateColumns: `2rem repeat(${hours.length}, minmax(0, 1fr))` }}
          aria-hidden
        >
          <span />
          {hours.map((h) => (
            <span key={h} className="pb-1 text-center text-xs text-muted-foreground tabular-nums">
              {h}시
            </span>
          ))}
          {WEEKDAYS.map((weekday) => (
            <Row key={weekday} weekday={weekday} hours={hours} countOf={countOf} max={max} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
        적음
        {STEP_CLASS.slice(1).map((c) => (
          <span key={c} className={cn("size-3 rounded-sm", c)} />
        ))}
        많음 · 가장 많은 칸 {max}회
      </div>
      <table className="sr-only">
        <caption>요일·시간대별 이용 시작 횟수</caption>
        <thead>
          <tr>
            <th scope="col">요일</th>
            {hours.map((h) => (
              <th key={h} scope="col">
                {h}시
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((weekday) => (
            <tr key={weekday}>
              <th scope="row">{WEEKDAY_LABELS[weekday]}요일</th>
              {hours.map((h) => (
                <td key={h}>{countOf(weekday, h)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  weekday,
  hours,
  countOf,
  max,
}: {
  weekday: number;
  hours: number[];
  countOf: (weekday: number, hour: number) => number;
  max: number;
}) {
  return (
    <>
      <span className="flex items-center text-xs text-muted-foreground">{WEEKDAY_LABELS[weekday]}</span>
      {hours.map((hour) => {
        const count = countOf(weekday, hour);
        return (
          <Tooltip key={hour}>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className={cn(
                    "h-7 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    STEP_CLASS[stepOf(count, max)],
                  )}
                />
              }
            />
            <TooltipContent>
              {WEEKDAY_LABELS[weekday]}요일 {hour}시 · <span className="tabular-nums">{count}회</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
