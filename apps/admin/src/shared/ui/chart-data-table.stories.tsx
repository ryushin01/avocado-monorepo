import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChartDataTable } from "./chart-data-table";

const DATA = [
  { cafe: "강남점", plays: 128 },
  { cafe: "홍대점", plays: 97 },
  { cafe: "판교점", plays: 64 },
];

const meta = {
  title: "백오피스/ChartDataTable",
  component: ChartDataTable,
  args: { label: "매장별 이용 횟수 표", children: null },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ChartDataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 평소에는 보이지 않고(화면 낭독기는 읽음), Tab으로 초점을 주면 차트 자리에 나타난다. 감싸는 요소는 relative여야 한다. */
export const Default: Story = {
  render: (args) => (
    <div className="relative flex h-48 w-96 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      <span aria-hidden>(차트 자리) Tab을 눌러 보세요</span>
      <ChartDataTable label={args.label}>
        <table>
          <caption>매장별 이용 횟수</caption>
          <thead>
            <tr>
              <th scope="col">매장</th>
              <th scope="col">이용</th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((row) => (
              <tr key={row.cafe}>
                <th scope="row">{row.cafe}</th>
                <td>{row.plays}회</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartDataTable>
    </div>
  ),
};
