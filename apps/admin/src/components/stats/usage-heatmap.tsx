"use client";

import { type KeyboardEvent, useRef, useState } from "react";

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
 *
 * 격자 자체가 접근 가능한 표(role="grid")다. Tab으로는 한 번만 들어오고, 안에서는 화살표·Home·End로
 * 칸을 옮긴다(칸마다 Tab을 누르지 않아도 된다). 칸마다 "월요일 14시 12회" 같은 이름이 있어
 * 화면 낭독기도 같은 내용을 읽고, 마우스를 올리거나 초점을 주면 툴팁으로 횟수를 보여준다.
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
  const counts = new Map(cells.map((c) => [`${c.weekday}:${c.hour}`, c.count]));
  const countOf = (weekday: number, hour: number) => counts.get(`${weekday}:${hour}`) ?? 0;

  const [active, setActive] = useState({ row: 0, col: 0 });
  const refs = useRef(new Map<string, HTMLElement>());
  const rows = WEEKDAYS.length;
  const cols = hours.length;

  const move = (row: number, col: number) => {
    const next = { row: Math.min(rows - 1, Math.max(0, row)), col: Math.min(cols - 1, Math.max(0, col)) };
    setActive(next);
    refs.current.get(`${next.row}:${next.col}`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const { row, col } = active;
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(row, col + 1),
      ArrowLeft: () => move(row, col - 1),
      ArrowDown: () => move(row + 1, col),
      ArrowUp: () => move(row - 1, col),
      Home: () => move(row, 0),
      End: () => move(row, cols - 1),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          role="grid"
          aria-label="요일·시간대별 이용 시작 횟수"
          onKeyDown={onKeyDown}
          className="grid min-w-[560px] gap-0.5"
          style={{ gridTemplateColumns: `2rem repeat(${cols}, minmax(0, 1fr))` }}
        >
          <div role="row" className="contents">
            <span role="columnheader" aria-label="요일" />
            {hours.map((h) => (
              <span
                key={h}
                role="columnheader"
                className="pb-1 text-center text-xs text-muted-foreground tabular-nums"
              >
                {h}시
              </span>
            ))}
          </div>
          {WEEKDAYS.map((weekday, row) => (
            <div key={weekday} role="row" className="contents">
              <span role="rowheader" className="flex items-center text-xs text-muted-foreground">
                {WEEKDAY_LABELS[weekday]}
              </span>
              {hours.map((hour, col) => {
                const count = countOf(weekday, hour);
                const label = `${WEEKDAY_LABELS[weekday]}요일 ${hour}시 ${count}회`;
                const isActive = active.row === row && active.col === col;
                return (
                  <Tooltip key={hour}>
                    <TooltipTrigger
                      render={
                        <span
                          role="gridcell"
                          aria-label={label}
                          tabIndex={isActive ? 0 : -1}
                          ref={(el) => {
                            if (el) refs.current.set(`${row}:${col}`, el);
                          }}
                          onFocus={() => setActive({ row, col })}
                          className={cn(
                            "h-7 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            STEP_CLASS[stepOf(count, max)],
                          )}
                        />
                      }
                    />
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
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
      <p className="sr-only">
        표 안에서는 화살표 키로 칸을 옮깁니다. 가장 많은 칸은 {max}회입니다.
      </p>
    </div>
  );
}
