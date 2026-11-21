import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OfflineDataNotice } from "./offline-data-notice";

const meta = {
  title: "키오스크/OfflineDataNotice",
  component: OfflineDataNotice,
  decorators: [(Story) => <div className="w-[40rem]"><Story /></div>],
} satisfies Meta<typeof OfflineDataNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 백오피스에 닿지 않아 카탈로그 스냅숏으로 보여 줄 때 */
export const Default: Story = {};
