import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@avocado/ui/components/card";

import { Delta } from "./delta";
import { formatNumber } from "@/shared/lib/format";
import { Sparkline } from "./sparkline";

/** 숫자 하나 + 지난 기간 대비 증감 + (있으면) 작은 추이선 */
export function KpiTile({
  label,
  icon: Icon,
  value,
  previous,
  unit,
  upIsGood,
  comparedTo,
  trend,
}: {
  label: string;
  icon: LucideIcon;
  value: number | null;
  previous: number | null;
  unit: string;
  upIsGood?: boolean;
  /** 예: "지난 28일" */
  comparedTo: string;
  trend?: { current: number[]; previous: number[] };
}) {
  return (
    <Card data-testid="kpi-tile" className="gap-3 pt-0">
      <CardHeader className="gap-3 px-0">
        <CardDescription className="flex h-8 items-center gap-2 bg-foreground px-3 font-mono text-xs tracking-[0.02em] text-background">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </CardDescription>
        <CardTitle className="px-(--card-spacing) text-[2.25rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
          {value === null ? "–" : formatNumber(value)}
          <span className="ml-1 font-mono text-sm font-normal tracking-normal text-muted-foreground">{unit}</span>
        </CardTitle>
        <p className="flex flex-wrap items-center gap-1 px-(--card-spacing) text-xs text-muted-foreground">
          <Delta current={value} previous={previous} upIsGood={upIsGood} />
          {comparedTo} 대비
          {previous !== null && <span className="tabular-nums">({formatNumber(previous)}{unit})</span>}
        </p>
      </CardHeader>
      {trend && (
        <CardContent>
          <Sparkline current={trend.current} previous={trend.previous} />
        </CardContent>
      )}
    </Card>
  );
}
