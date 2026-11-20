import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Link from "next/link";

import { SkipLink } from "./skip-link";

const meta = {
  title: "부품/SkipLink",
  component: SkipLink,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 평소에는 숨어 있다가 Tab으로 초점을 받으면 나타난다(KWCAG 6.4.1). 본문 main에 id="main"이 있어야 한다. */
export const Default: Story = {
  render: () => (
    <div className="w-96">
      <SkipLink />
      <nav aria-label="주 메뉴" className="flex gap-3 text-sm">
        <Link href="/games">보드게임</Link>
        <Link href="/inventory">재고 관리</Link>
        <Link href="/reservations">예약·대기</Link>
      </nav>
      <main id="main" tabIndex={-1} className="mt-4">
        <p className="text-sm">
          이 칸을 누른 뒤 Shift+Tab을 반복해서 눌러 세 메뉴 링크를 지나면 &lsquo;본문 바로가기&rsquo;가 나타납니다.
        </p>
      </main>
    </div>
  ),
};
