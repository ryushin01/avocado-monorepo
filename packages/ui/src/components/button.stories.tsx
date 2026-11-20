import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarPlus, Trash2 } from "lucide-react";

import { Button } from "./button";
import { Spinner } from "./spinner";

const VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const SIZES = ["xs", "sm", "default", "lg"] as const;

const meta = {
  title: "부품/Button",
  component: Button,
  args: { children: "예약 등록" },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "select", options: [...SIZES, "icon", "icon-xs", "icon-sm", "icon-lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {SIZES.map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <CalendarPlus />
        예약 등록
      </>
    ),
  },
};

/** 아이콘만 있는 버튼은 aria-label로 이름을 준다(KWCAG 5.1.1). */
export const IconOnly: Story = {
  args: { variant: "ghost", size: "icon", "aria-label": "예약 삭제", children: <Trash2 /> },
};

/** 처리 중에는 막아 두 번 보내지 않는다. */
export const Pending: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Spinner aria-hidden />
        저장하는 중…
      </>
    ),
  },
};
