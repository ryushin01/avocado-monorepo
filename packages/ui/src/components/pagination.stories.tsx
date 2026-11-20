import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

const meta = { title: "부품/Pagination", component: Pagination } satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 지금 페이지는 aria-current="page"로 알린다. 번호의 접근 이름("2페이지")은 보이는 숫자로 시작하게 숨은 글자를 덧붙인다(KWCAG 6.5.3). */
export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="?page=1" />
        </PaginationItem>
        {[1, 2, 3].map((page) => (
          <PaginationItem key={page}>
            <PaginationLink href={`?page=${page}`} isActive={page === 2}>
              {page}
              <span className="sr-only">페이지</span>
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="?page=3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
