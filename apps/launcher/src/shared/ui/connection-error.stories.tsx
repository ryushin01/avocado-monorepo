import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ConnectionError } from "./connection-error";

const meta = {
  title: "키오스크/ConnectionError",
  component: ConnectionError,
  args: { reason: "unreachable" },
  argTypes: { reason: { control: "select", options: ["unreachable", "not-found", "rejected"] } },
  decorators: [(Story) => <div className="w-[32rem]"><Story /></div>],
} satisfies Meta<typeof ConnectionError>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 백오피스에 닿지 않을 때 손님에게 보이는 안내 */
export const Unreachable: Story = {};

export const NotFound: Story = { args: { reason: "not-found" } };
