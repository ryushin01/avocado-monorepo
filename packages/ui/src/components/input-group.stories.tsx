import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search, X } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./input-group";

const meta = { title: "부품/InputGroup", component: InputGroup } satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 검색 칸처럼 아이콘·버튼을 붙인 입력. 아이콘은 꾸밈이고, 칸과 버튼에는 이름을 준다. */
export const SearchField: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput type="search" aria-label="게임 이름 검색" placeholder="게임 이름 검색" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label="검색어 지우기">
          <X />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
