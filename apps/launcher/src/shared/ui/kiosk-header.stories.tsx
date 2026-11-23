import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KioskDivider, KioskHeader, KioskTitle, MonoLabel } from "./kiosk-header";

const meta = {
  title: "키오스크/KioskHeader",
  component: KioskHeader,
  args: { current: "games" },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof KioskHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 하위 화면 머리글: 왼쪽 상호(처음 화면 링크), 가운데 로고, 오른쪽 메뉴와 외곽선 버튼. 지금 화면은 밑줄로 표시한다. */
export const Games: Story = {};

/** 대기 등록 화면에서는 오른쪽 외곽선 버튼이 채워진다. */
export const Waitlist: Story = { args: { current: "waitlist" } };

/** 시작 화면: 본문이 메뉴이므로 오른쪽에는 소개 글자만 둔다. */
export const Home: Story = { args: { current: "home" } };

/** 화면 제목(세리프+산세리프), 고정폭 꼬리표, 양 끝 삼각형 구분선 */
export const TitleAndDivider: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-8">
      <KioskTitle label="Waitlist" serif="현장" sans="대기" />
      <MonoLabel>Menu /01</MonoLabel>
      <KioskDivider />
    </div>
  ),
};
