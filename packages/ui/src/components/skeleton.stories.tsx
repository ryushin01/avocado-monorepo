import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "./skeleton";

const meta = { title: "부품/Skeleton", component: Skeleton } satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 불러오는 동안 자리를 잡아 화면이 밀리지 않게 한다. 화면 낭독기에는 상태 문구로 알린다. */
export const List: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <p role="status" className="sr-only">
        목록을 불러오는 중
      </p>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  ),
};
