import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Keypad } from "./keypad";

const meta = {
  title: "키오스크/Keypad",
  component: Keypad,
  args: { label: "예약하신 휴대전화 번호 뒷자리 4자리를 눌러주세요", onComplete: () => {} },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Keypad>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 손가락으로 누르는 큰 숫자 패드. 누른 자리는 화면 낭독기에도 알린다. */
export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };
