import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Spinner } from "./spinner";

const meta = { title: "부품/Spinner", component: Spinner } satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** role="status"와 이름("불러오는 중")이 있어 화면 낭독기에도 알린다. */
export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner />
      <Spinner className="size-6" aria-label="목록 불러오는 중" />
      <Spinner className="size-8" aria-label="통계 계산 중" />
    </div>
  ),
};
