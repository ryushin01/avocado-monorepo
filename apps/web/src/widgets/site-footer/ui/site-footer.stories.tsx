import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SiteFooter } from "./site-footer";

const meta = {
  title: "홈페이지/SiteFooter",
  component: SiteFooter,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 게임 유형과 사이트 안내(온라인 예약 포함) 링크 */
export const Default: Story = {};
