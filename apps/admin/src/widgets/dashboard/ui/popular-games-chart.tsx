"use client";

import { Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@avocado/ui/components/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@avocado/ui/components/tabs";
import {
  POPULARITY_PERIOD_DAYS,
  POPULARITY_PERIOD_LABELS,
  POPULARITY_PERIODS,
  type PopularityRanking,
} from "@/entities/play";

// 단일 계열이므로 기본 팔레트의 1번(파랑)만 쓴다. 라이트·다크 각각 대비 검증을 통과한 값.
const chartConfig = {
  playCount: {
    label: "이용 횟수",
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
} satisfies ChartConfig;

const NAME_MAX = 14;

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));

/** 축 이름표: "1. 게임 이름". 길면 줄이고, 전체 이름은 툴팁과 표에서 보여준다. */
function RankTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const text = payload?.value ?? "";
  const short = text.length > NAME_MAX ? `${text.slice(0, NAME_MAX - 1)}…` : text;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={12}
      className="fill-muted-foreground"
    >
      <title>{text}</title>
      {short}
    </text>
  );
}

function RankingChart({ ranking }: { ranking: PopularityRanking }) {
  const label = POPULARITY_PERIOD_LABELS[ranking.period];
  const rows = ranking.items.map((item) => ({
    label: `${item.rank}. ${item.game.name}`,
    name: item.game.name,
    playCount: item.playCount,
  }));

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Trophy />
          </EmptyMedia>
          <EmptyTitle>이용 기록이 없습니다</EmptyTitle>
          <EmptyDescription>
            최근 {POPULARITY_PERIOD_DAYS[ranking.period]}일 동안 이용된 게임이 없습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: rows.length * 34 + 8 }}
        aria-hidden
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={150}
            interval={0}
            tick={<RankTick />}
          />
          <XAxis type="number" dataKey="playCount" hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_label, payload) =>
                  (payload?.[0]?.payload as { label?: string } | undefined)?.label
                }
                formatter={(value) => (
                  <span>
                    {label} 이용{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {String(value)}회
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="playCount"
            fill="var(--color-playCount)"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            activeBar={{ fillOpacity: 0.8 }}
          >
            <LabelList
              dataKey="playCount"
              position="right"
              offset={8}
              className="fill-foreground tabular-nums"
              fontSize={12}
              formatter={(value) => `${String(value)}회`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* 화면 낭독기와 키보드 사용자를 위한 같은 데이터의 표 */}
      <table className="sr-only">
        <caption>{label} 인기 게임 순위</caption>
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col">게임</th>
            <th scope="col">이용 횟수</th>
          </tr>
        </thead>
        <tbody>
          {ranking.items.map((item) => (
            <tr key={item.game.id}>
              <td>{item.rank}</td>
              <th scope="row">{item.game.name}</th>
              <td>{item.playCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** 주간·월간 인기 게임 1~10위 */
export function PopularGamesChart({
  rankings,
}: {
  rankings: Record<(typeof POPULARITY_PERIODS)[number], PopularityRanking>;
}) {
  return (
    <Tabs defaultValue="week" className="gap-3">
      <TabsList aria-label="기간">
        {POPULARITY_PERIODS.map((period) => (
          <TabsTrigger key={period} value={period}>
            {POPULARITY_PERIOD_LABELS[period]}
          </TabsTrigger>
        ))}
      </TabsList>
      {POPULARITY_PERIODS.map((period) => {
        const ranking = rankings[period];
        return (
          <TabsContent key={period} value={period} className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              최근 {POPULARITY_PERIOD_DAYS[period]}일 · {formatDay(ranking.from)} ~{" "}
              {formatDay(ranking.to)} · 이용 횟수 기준
            </p>
            <RankingChart ranking={ranking} />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
