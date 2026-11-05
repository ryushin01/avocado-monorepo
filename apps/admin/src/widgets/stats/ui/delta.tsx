import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@avocado/ui/lib/utils";

import { changeRate } from "@/entities/stats/schema";

import { formatNumber } from "@/shared/lib/format";

/**
 * 지난 기간 대비 증감. 화살표 아이콘과 부호로 방향을 보여주고, 색은 좋고 나쁨을 덧붙인다.
 * upIsGood가 없으면(평균 이용 시간처럼 좋고 나쁨이 없는 값) 중립 색으로 둔다.
 */
export function Delta({
  current,
  previous,
  upIsGood,
  className,
}: {
  current: number | null;
  previous: number | null;
  upIsGood?: boolean;
  className?: string;
}) {
  const rate = current === null || previous === null ? null : changeRate(current, previous);
  if (rate === null) {
    return <span className={cn("text-xs text-muted-foreground", className)}>비교할 기록 없음</span>;
  }
  const Icon = rate > 0 ? ArrowUpRight : rate < 0 ? ArrowDownRight : Minus;
  const tone =
    rate === 0 || upIsGood === undefined
      ? "text-muted-foreground"
      : (rate > 0) === upIsGood
        ? "text-[var(--delta-up)]"
        : "text-[var(--delta-down)]";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", tone, className)}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{rate > 0 ? "증가" : rate < 0 ? "감소" : "변화 없음"}</span>
      {rate > 0 ? "+" : ""}
      {formatNumber(rate)}%
    </span>
  );
}
