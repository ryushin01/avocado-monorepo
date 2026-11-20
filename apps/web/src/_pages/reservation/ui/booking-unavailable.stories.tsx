import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BookingUnavailable } from "./booking-unavailable";

const meta = {
  title: "홈페이지/온라인 예약/BookingUnavailable",
  component: BookingUnavailable,
  args: { reason: "off" },
  argTypes: { reason: { control: "select", options: ["off", "unreachable", "rejected"] } },
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="rounded-lg bg-card p-6 text-card-foreground"><Story /></div>],
} satisfies Meta<typeof BookingUnavailable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 온라인 예약을 열지 않았을 때(설정 없음) 매장 전화번호로 안내한다. */
export const Off: Story = {};

/** 예약 서버에 닿지 않을 때. 제목 id가 고정이라 문서 페이지에는 Off만 둔다. */
export const Unreachable: Story = { tags: ["!autodocs"], args: { reason: "unreachable" } };
