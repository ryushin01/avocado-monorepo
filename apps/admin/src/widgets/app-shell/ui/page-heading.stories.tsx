import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CalendarPlus } from "lucide-react";

import { Button } from "@avocado/ui/components/button";

import { PageHeading } from "./page-heading";

const meta = {
  title: "백오피스/PageHeading",
  component: PageHeading,
  args: {
    icon: "reservations",
    title: "예약·대기 · 강남점",
    description: "키오스크에서 등록한 현장 대기와 전화·온라인 예약을 함께 관리합니다.",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof PageHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 화면 제목(h1)과 설명, 오른쪽의 주요 작업 */
export const Default: Story = {
  args: {
    actions: (
      <Button>
        <CalendarPlus />
        예약 등록
      </Button>
    ),
  },
};
