import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ListEmpty, ListSkeleton } from "./list-empty";

const meta = {
  title: "백오피스/ListEmpty",
  component: ListEmpty,
  decorators: [(Story) => <div className="w-[32rem]"><Story /></div>],
} satisfies Meta<typeof ListEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 검색 결과가 없을 때(기본 문구) */
export const Default: Story = {};

export const NoCafe: Story = {
  args: { title: "관리할 매장이 없습니다", description: "소속 매장이 없거나 폐점했습니다. 관리자에게 문의해주세요." },
};

/** 목록을 불러오는 동안 */
export const Loading: Story = { render: () => <ListSkeleton /> };
