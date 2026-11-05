"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@avocado/ui/components/chart";

// 단일 계열이므로 기본 팔레트의 1번(파랑)만 쓴다. 라이트·다크 각각 대비 검증을 통과한 값.
const chartConfig = {
  gameCount: {
    label: "게임",
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
} satisfies ChartConfig;

type Row = { label: string; gameCount: number };

/** 구간별 게임 수 (세로 막대). 막대 위에 값을 적고, 호버하면 구간과 값을 보여준다. */
export function DistributionChart({
  data,
  caption,
  bucketHeader,
}: {
  data: Row[];
  /** 화면 낭독기용 표 제목 */
  caption: string;
  /** 표의 구간 열 이름 */
  bucketHeader: string;
}) {
  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-56 w-full"
        aria-hidden
      >
        <BarChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={8}
          />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(value) => (
                  <span>
                    게임{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {String(value)}종
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="gameCount"
            fill="var(--color-gameCount)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            activeBar={{ fillOpacity: 0.8 }}
          >
            <LabelList
              dataKey="gameCount"
              position="top"
              offset={6}
              className="fill-foreground tabular-nums"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{bucketHeader}</th>
            <th scope="col">게임(종)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.gameCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
