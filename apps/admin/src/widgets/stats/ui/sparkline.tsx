"use client";

import { Line, LineChart, YAxis } from "recharts";

import { type ChartConfig, ChartContainer } from "@avocado/ui/components/chart";

const config = {
  previous: { label: "지난 기간", color: "var(--trend-previous)" },
  current: { label: "이번 기간", theme: { light: "#2a78d6", dark: "#3987e5" } },
} satisfies ChartConfig;

/**
 * 작은 추이선. 지난 기간은 회색, 이번 기간은 파랑으로 이어 그린다.
 * 숫자는 옆의 글자가 전하므로 화면 낭독기에는 숨긴다.
 * max를 주면 여러 줄(매장별)이 같은 세로 축을 쓴다.
 */
export function Sparkline({
  current,
  previous = [],
  max,
  className = "h-10 w-full",
}: {
  current: number[];
  previous?: number[];
  max?: number;
  className?: string;
}) {
  const data = [
    ...previous.map((v, i) => ({
      previous: v,
      // 두 선이 끊기지 않게 지난 기간 마지막 점을 이번 기간 선의 시작으로도 쓴다.
      current: i === previous.length - 1 ? v : null,
    })),
    ...current.map((v) => ({ previous: null, current: v })),
  ];
  return (
    <ChartContainer config={config} className={className} aria-hidden>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis hide domain={[0, max ?? "auto"]} />
        {previous.length > 0 && (
          <Line
            dataKey="previous"
            stroke="var(--color-previous)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        )}
        <Line
          dataKey="current"
          stroke="var(--color-current)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
