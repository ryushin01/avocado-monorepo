import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";

const VARIANTS = [
  ["default", "확정"],
  ["secondary", "가예약"],
  ["outline", "온라인"],
  ["destructive", "노쇼"],
  ["ghost", "보조"],
  ["link", "링크"],
] as const;

const meta = {
  title: "부품/Badge",
  component: Badge,
  args: { children: "확정" },
  argTypes: { variant: { control: "select", options: VARIANTS.map(([variant]) => variant) } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 예약 상태처럼 색에만 기대지 않도록 글자로도 상태를 적는다(KWCAG 5.4.1). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map(([variant, label]) => (
        <Badge key={variant} variant={variant}>
          {label}
        </Badge>
      ))}
    </div>
  ),
};
