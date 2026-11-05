"use client";

import { CircleCheck, Trash2, Wrench, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@avocado/ui/components/chart";
import type { CafeInventoryStats } from "@/entities/inventory";
import { INVENTORY_STATUS_LABELS, type InventoryStatus } from "@/entities/inventory";

// 상태(state)를 나타내므로 상태 팔레트를 쓴다: 이용 가능 = good, 점검 중 = warning.
// 폐기는 경고가 아니라 '쓰지 않음'이라 중립 회색으로 둔다.
// 점검 중(노랑)은 밝은 배경에서 대비가 3:1 미만이므로 색만으로 구분하지 않도록
// 범례에 아이콘·이름을 함께 두고, 같은 수치를 아래 '매장별 현황' 표로도 제공한다.
const STATUS_STYLE: Record<InventoryStatus, { color: string; icon: LucideIcon }> = {
  available: { color: "#0ca30c", icon: CircleCheck },
  maintenance: { color: "#fab219", icon: Wrench },
  retired: { color: "#898781", icon: Trash2 },
};

const ORDER = ["available", "maintenance", "retired"] as const;

const chartConfig = Object.fromEntries(
  ORDER.map((status) => [
    status,
    { label: INVENTORY_STATUS_LABELS[status], color: STATUS_STYLE[status].color },
  ]),
) satisfies ChartConfig;

/** 관리자용: 매장별 재고 상태 구성 (가로 누적 막대, 게임 종류 수) */
export function CafeStatusChart({ cafes }: { cafes: CafeInventoryStats[] }) {
  const rows = cafes.map((c) => ({
    name: c.cafe.name,
    available: c.gameCount - c.maintenanceCount - c.retiredCount,
    maintenance: c.maintenanceCount,
    retired: c.retiredCount,
  }));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="범례">
        {ORDER.map((status) => {
          const { color, icon: Icon } = STATUS_STYLE[status];
          return (
            <li key={status} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <Icon className="size-3.5 text-muted-foreground" />
              {INVENTORY_STATUS_LABELS[status]}
            </li>
          );
        })}
      </ul>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: Math.max(160, rows.length * 44) }}
        aria-hidden
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <XAxis type="number" hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: STATUS_STYLE[name as InventoryStatus].color,
                        }}
                      />
                      {INVENTORY_STATUS_LABELS[name as InventoryStatus]}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {String(value)}종
                    </span>
                  </div>
                )}
              />
            }
          />
          {ORDER.map((status, i) => (
            <Bar
              key={status}
              dataKey={status}
              stackId="status"
              fill={`var(--color-${status})`}
              // 조각 사이에 배경색 2px 틈을 둬 경계를 구분한다.
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={24}
              radius={i === ORDER.length - 1 ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
