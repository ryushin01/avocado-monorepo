import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RESERVATION_STATUSES } from "../model/types";
import { ReservationStatusBadge } from "./reservation-status-badge";

const meta = {
  title: "백오피스/ReservationStatusBadge",
  component: ReservationStatusBadge,
  args: { status: "confirmed" },
  argTypes: { status: { control: "select", options: RESERVATION_STATUSES } },
} satisfies Meta<typeof ReservationStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 예약 목록의 상태. 색만이 아니라 글자로도 상태를 적는다. */
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {RESERVATION_STATUSES.map((status) => (
        <ReservationStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
