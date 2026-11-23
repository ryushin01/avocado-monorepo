import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";

import { formatNumber } from "@/shared/lib/format";


/** 숫자 하나를 크게 보여주는 요약 칸. 레퍼런스의 결과 칸처럼 잉크 띠(고정폭 라벨) 아래에 큰 숫자를 둔다. */
export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Card data-testid="stat-tile" className="gap-3 pt-0">
      <CardHeader className="gap-3 px-0">
        <CardDescription className="flex h-8 items-center gap-2 bg-foreground px-3 font-mono text-xs tracking-[0.02em] text-background">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </CardDescription>
        <CardTitle className="px-(--card-spacing) text-[2.25rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
          {formatNumber(value)}
          <span className="ml-1 font-mono text-sm font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        </CardTitle>
        {hint && <p className="px-(--card-spacing) text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}
