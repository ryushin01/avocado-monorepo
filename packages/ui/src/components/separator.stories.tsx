import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Separator } from "./separator";

const meta = { title: "부품/Separator", component: Separator } satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-72">
      <p className="font-medium">보드게임</p>
      <Separator className="my-3" />
      <p className="text-sm text-muted-foreground">재고와 이용 기록</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>재고</span>
      <Separator orientation="vertical" />
      <span>이용 기록</span>
      <Separator orientation="vertical" />
      <span>통계</span>
    </div>
  ),
};
