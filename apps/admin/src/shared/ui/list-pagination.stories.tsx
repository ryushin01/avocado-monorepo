import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ListPagination } from "./list-pagination";

const meta = {
  title: "백오피스/ListPagination",
  component: ListPagination,
  args: { page: 3, pageCount: 9, path: "/games", params: { q: "카탄" } },
} satisfies Meta<typeof ListPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 검색 조건을 유지한 채 쪽을 넘긴다. 번호의 접근 이름은 보이는 숫자로 시작한다("3페이지"). */
export const Default: Story = {};

export const FirstPage: Story = { args: { page: 1 } };
