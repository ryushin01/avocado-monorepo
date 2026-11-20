import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";

const DATA = [
  { day: "월", plays: 38 },
  { day: "화", plays: 42 },
  { day: "수", plays: 35 },
  { day: "목", plays: 51 },
  { day: "금", plays: 77 },
  { day: "토", plays: 112 },
  { day: "일", plays: 96 },
];
const CONFIG = { plays: { label: "이용", color: "var(--chart-1)" } } satisfies ChartConfig;

// ChartContainer는 config·children이 꼭 있어야 해 스토리마다 직접 그린다(컨트롤 없음).
const meta = { title: "부품/Chart" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 백오피스 ChartDataTable과 같은 방식: 평소에는 보이지 않고(화면 낭독기는 읽음), Tab으로 초점을 받으면 차트 위에 나타난다.
 * 툴팁에만 있는 값을 마우스 없이 보는 사용자가 이 표로 본다. 감싸는 요소는 relative여야 한다.
 */
function DataTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="sr-only focus:not-sr-only focus:absolute focus:inset-0 focus:z-10 focus:overflow-auto focus:rounded-lg focus:bg-card focus:p-3 focus:text-sm focus:shadow-md focus:outline-none focus:ring-3 focus:ring-ring/50 [&_caption]:mb-2 [&_caption]:text-left [&_caption]:font-medium [&_table]:w-full [&_td]:px-2 [&_td]:py-1 [&_td]:tabular-nums [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium"
    >
      {children}
    </div>
  );
}

/**
 * 차트는 화면 낭독기에서 숨기고(초점도 받지 않게 accessibilityLayer={false}), 값은 막대 끝에 적는다.
 * 같은 값의 표를 함께 두어 Tab으로 초점을 주면 차트 위에 보인다.
 */
export const Bars: Story = {
  render: () => (
    <figure className="relative w-[28rem]">
      <figcaption className="mb-2 text-sm font-medium">요일별 이용 횟수</figcaption>
      <ChartContainer config={CONFIG} className="h-56 w-full" aria-hidden>
        <BarChart data={DATA} accessibilityLayer={false}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="plays" fill="var(--color-plays)" radius={4}>
            <LabelList dataKey="plays" position="top" className="fill-foreground text-xs tabular-nums" />
          </Bar>
        </BarChart>
      </ChartContainer>
      <DataTable label="요일별 이용 횟수 표">
      <table>
        <caption>요일별 이용 횟수</caption>
        <thead>
          <tr>
            <th scope="col">요일</th>
            <th scope="col">이용</th>
          </tr>
        </thead>
        <tbody>
          {DATA.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.plays}회</td>
            </tr>
          ))}
        </tbody>
      </table>
      </DataTable>
    </figure>
  ),
};
