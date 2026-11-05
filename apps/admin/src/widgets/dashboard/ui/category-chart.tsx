"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@avocado/ui/components/chart";
import { GAME_CATEGORY_LABELS, type GameCategory } from "@/entities/game";

// 단일 계열이므로 기본 팔레트의 1번(파랑)만 쓴다. 라이트·다크 각각 대비 검증을 통과한 값.
const chartConfig = {
  gameCount: {
    label: "보유 게임",
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
} satisfies ChartConfig;

type Row = { category: GameCategory; gameCount: number; boxCount: number };

/** 유형별 보유 게임 수 (가로 막대). 막대 끝에 값을 적고, 호버하면 박스 수도 보여준다. */
export function CategoryChart({ data }: { data: Row[] }) {
  const rows = data.map((d) => ({ ...d, label: GAME_CATEGORY_LABELS[d.category] }));

  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-72 w-full"
        aria-hidden
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 0, right: 32, top: 0, bottom: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid horizontal={false} strokeDasharray="0" />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={96}
          />
          <XAxis type="number" dataKey="gameCount" hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_value, _name, item) => {
                  const row = item.payload as Row;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span>
                        보유 게임{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {row.gameCount}종
                        </span>
                      </span>
                      <span>
                        보유 박스{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {row.boxCount}개
                        </span>
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="gameCount"
            fill="var(--color-gameCount)"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            activeBar={{ fillOpacity: 0.8 }}
          >
            <LabelList
              dataKey="gameCount"
              position="right"
              offset={8}
              className="fill-foreground tabular-nums"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* 화면 낭독기와 키보드 사용자를 위한 같은 데이터의 표 */}
      <table className="sr-only">
        <caption>유형별 보유 현황</caption>
        <thead>
          <tr>
            <th scope="col">유형</th>
            <th scope="col">보유 게임(종)</th>
            <th scope="col">보유 박스(개)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <th scope="row">{r.label}</th>
              <td>{r.gameCount}</td>
              <td>{r.boxCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
