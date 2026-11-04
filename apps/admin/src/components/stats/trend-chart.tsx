"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@avocado/ui/components/chart";

import type { DailyPoint } from "@/lib/stats/types";

import { formatShortDate, formatTickDate } from "./format";

/**
 * 일별 이용 추이. 이번 기간(파랑 실선)을 강조하고, 지난 기간(회색 점선)은 비교용으로 겹친다.
 * 회색은 강조하지 않는 맥락 색이라 색 하나만으로 구분하지 않도록 점선·범례를 함께 쓴다.
 */
export function TrendChart({ data, period }: { data: DailyPoint[]; period: number }) {
  const config = {
    current: { label: `최근 ${period}일`, theme: { light: "#2a78d6", dark: "#3987e5" } },
    previous: { label: `그 전 ${period}일`, color: "var(--trend-previous)" },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-4 text-sm" aria-label="범례">
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" aria-hidden />
          {config.current.label}
        </li>
        <li className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-0 w-5 border-t-2 border-dashed border-[var(--trend-previous)]"
            aria-hidden
          />
          {config.previous.label}
        </li>
      </ul>
      <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-hidden>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={formatTickDate}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatShortDate(String(value))}
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {config[name as keyof typeof config].label}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">{String(value)}회</span>
                  </span>
                )}
              />
            }
          />
          <Line
            dataKey="previous"
            stroke="var(--color-previous)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            dataKey="current"
            stroke="var(--color-current)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
          />
        </LineChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>일별 이용 횟수</caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">{config.current.label}</th>
            <th scope="col">{config.previous.label}의 같은 순서 날</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatShortDate(d.date)}</th>
              <td>{d.current}</td>
              <td>{d.previous}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
