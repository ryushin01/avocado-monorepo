import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RotateCw } from "lucide-react";

import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
  title: "부품/Tooltip",
  component: Tooltip,
  decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 툴팁은 보조 설명이다. 버튼의 이름은 aria-label로 따로 준다(툴팁만으로 이름을 대신하지 않음). */
export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="새로고침" />}>
        <RotateCw />
      </TooltipTrigger>
      <TooltipContent>목록을 지금 다시 받습니다</TooltipContent>
    </Tooltip>
  ),
};
