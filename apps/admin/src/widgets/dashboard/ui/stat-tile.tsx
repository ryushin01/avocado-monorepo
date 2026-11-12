import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";

import { formatNumber } from "@/shared/lib/format";


/** 숫자 하나를 크게 보여주는 요약 칸 */
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
    <Card data-testid="stat-tile">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-4" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {formatNumber(value)}
          <span className="ml-0.5 text-base font-normal text-muted-foreground">
            {unit}
          </span>
        </CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}
