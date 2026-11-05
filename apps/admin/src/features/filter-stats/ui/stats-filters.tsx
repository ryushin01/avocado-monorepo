"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";

import { buildListHref } from "@/shared/lib/list";
import { DEFAULT_STAT_PERIOD, STAT_PERIODS, type StatPeriod } from "@/entities/stats";

export const ALL_CAFES = "all";

const PERIOD_ITEMS = STAT_PERIODS.map((p) => ({ value: String(p), label: `최근 ${p}일` }));

/** 통계 화면 맨 위 한 줄: 기간(먼저) · 매장(관리자). 조건은 주소에 남는다. */
export function StatsFilters({
  period,
  cafe,
  cafes,
}: {
  period: StatPeriod;
  cafe: string;
  /** 주면 매장 선택을 보여준다 (관리자) */
  cafes?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: { period?: string; cafe?: string }) => {
    const p = next.period ?? String(period);
    const c = next.cafe ?? cafe;
    startTransition(() =>
      router.replace(
        buildListHref("/stats", {
          period: p === String(DEFAULT_STAT_PERIOD) ? undefined : p,
          cafe: c === ALL_CAFES ? undefined : c,
        }),
        { scroll: false },
      ),
    );
  };

  const cafeItems = cafes && [{ value: ALL_CAFES, label: "전체 매장" }, ...cafes];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        items={PERIOD_ITEMS}
        value={String(period)}
        onValueChange={(v) => typeof v === "string" && go({ period: v })}
      >
        <SelectTrigger aria-label="기간" className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {cafeItems && (
        <Select
          items={cafeItems}
          value={cafe}
          onValueChange={(v) => typeof v === "string" && go({ cafe: v })}
        >
          <SelectTrigger aria-label="매장" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cafeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="불러오는 중" />}
    </div>
  );
}
