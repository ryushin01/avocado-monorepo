import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WAITLIST_STATUSES } from "../model/types";
import { WaitlistStatusBadge } from "./waitlist-status-badge";

const meta = {
  title: "백오피스/WaitlistStatusBadge",
  component: WaitlistStatusBadge,
  args: { status: "waiting" },
  argTypes: { status: { control: "select", options: WAITLIST_STATUSES } },
} satisfies Meta<typeof WaitlistStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {WAITLIST_STATUSES.map((status) => (
        <WaitlistStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
