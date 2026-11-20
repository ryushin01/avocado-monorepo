import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { INVENTORY_STATUSES } from "../model/types";
import { InUseBadge, InventoryStatusBadge } from "./inventory-status-badge";

const meta = {
  title: "백오피스/InventoryStatusBadge",
  component: InventoryStatusBadge,
  args: { status: "available" },
  argTypes: { status: { control: "select", options: INVENTORY_STATUSES } },
} satisfies Meta<typeof InventoryStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 재고 상태와, 지금 빌려 간 박스 수 */
export const WithInUse: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {INVENTORY_STATUSES.map((status) => (
        <InventoryStatusBadge key={status} status={status} />
      ))}
      <InUseBadge count={2} />
    </div>
  ),
};
