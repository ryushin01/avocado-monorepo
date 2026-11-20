import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const PERIODS = [
  { value: "today", label: "오늘", body: "오늘 이용 42건 · 평균 1시간 50분" },
  { value: "week", label: "이번 주", body: "이번 주 이용 286건 · 평균 1시간 45분" },
  { value: "month", label: "이번 달", body: "이번 달 이용 1,204건 · 평균 1시간 48분" },
];

const meta = { title: "부품/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 방향키로 탭을 옮기고 Home·End로 처음·끝 탭으로 간다. */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="today" className="w-96">
      <TabsList aria-label="기간">
        {PERIODS.map((p) => (
          <TabsTrigger key={p.value} value={p.value}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PERIODS.map((p) => (
        <TabsContent key={p.value} value={p.value} className="pt-2 text-sm">
          {p.body}
        </TabsContent>
      ))}
    </Tabs>
  ),
};

export const Line: Story = {
  render: () => (
    <Tabs defaultValue="week" className="w-96">
      <TabsList variant="line" aria-label="기간 (밑줄)">
        {PERIODS.map((p) => (
          <TabsTrigger key={p.value} value={p.value}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PERIODS.map((p) => (
        <TabsContent key={p.value} value={p.value} className="pt-2 text-sm">
          {p.body}
        </TabsContent>
      ))}
    </Tabs>
  ),
};
