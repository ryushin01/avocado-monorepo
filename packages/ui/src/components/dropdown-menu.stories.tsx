import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Check, MoreHorizontal, Pencil, XCircle } from "lucide-react";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = { title: "부품/DropdownMenu", component: DropdownMenu } satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 목록의 행 메뉴. 아이콘 버튼에는 대상 이름이 든 이름을 준다. 방향키로 항목을 옮기고 Esc로 닫는다. */
function RowMenu({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="김철수 예약 메뉴" />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>예약</DropdownMenuLabel>
          <DropdownMenuItem>
            <Pencil />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Check />
            확정
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <XCircle />
          예약 취소
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const RowActions: Story = { render: () => <RowMenu /> };

/** 연 상태(접근성 검사용, 문서 페이지에서는 뺌) */
export const Open: Story = { tags: ["!autodocs"], render: () => <RowMenu defaultOpen /> };
