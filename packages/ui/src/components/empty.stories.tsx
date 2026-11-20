import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarPlus, CalendarX } from "lucide-react";

import { Button } from "./button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";

const meta = { title: "부품/Empty", component: Empty } satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty className="w-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX />
        </EmptyMedia>
        <EmptyTitle>예약이 없습니다</EmptyTitle>
        <EmptyDescription>&lsquo;예약 등록&rsquo;으로 전화 예약을 기록하세요.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">
          <CalendarPlus />
          예약 등록
        </Button>
      </EmptyContent>
    </Empty>
  ),
};
