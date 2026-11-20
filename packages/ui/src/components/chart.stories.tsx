import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
 * 차트는 화면 낭독기에서 숨기고(초점도 받지 않게 accessibilityLayer={false}), 같은 값을 표로 함께 둔다.
 * 백오피스는 ChartDataTable로 이 표를 Tab 초점 때 보여 준다.
 */
export const Bars: Story = {
  render: () => (
    <figure className="w-[28rem]">
      <figcaption className="mb-2 text-sm font-medium">요일별 이용 횟수</figcaption>
      <ChartContainer config={CONFIG} className="h-56 w-full" aria-hidden>
        <BarChart data={DATA} accessibilityLayer={false}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="plays" fill="var(--color-plays)" radius={4} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
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
    </figure>
  ),
};
