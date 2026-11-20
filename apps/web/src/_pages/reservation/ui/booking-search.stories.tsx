import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BookingSearch } from "./booking-search";

const OPTIONS = {
  cafes: [
    { id: "c_gangnam", name: "강남점", region: "서울" },
    { id: "c_pangyo", name: "판교점", region: "경기" },
  ],
  dates: ["2026-11-20", "2026-11-21", "2026-11-22"],
  maxPartySize: 8,
};

const meta = {
  title: "홈페이지/온라인 예약/BookingSearch",
  component: BookingSearch,
  args: {
    options: OPTIONS,
    query: { cafe: undefined, date: undefined, partySize: undefined, submitted: false },
    today: "2026-11-20",
  },
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="rounded-lg bg-card p-6 text-card-foreground"><Story /></div>],
} satisfies Meta<typeof BookingSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 1단계: 매장·날짜·인원. 주소(GET)로 보내 JS 없이도 동작한다. */
export const Default: Story = {};

/** 매장을 고르지 않고 '빈 시간 보기'를 누르면 매장 칸에 오류를 잇는다. */
export const MissingCafe: Story = {
  args: { query: { cafe: undefined, date: "2026-11-21", partySize: 2, submitted: true } },
};
