import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Trash2 } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "./item";

const DEVICES = [
  { id: "d1", name: "입구 태블릿", prefix: "kio_ab12", active: true },
  { id: "d2", name: "창가 태블릿", prefix: "kio_cd34", active: false },
];

const meta = { title: "부품/Item", component: Item } satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 목록(ItemGroup)에는 이름을 주고, 항목에는 listitem 역할을 준다. 행 버튼의 이름에 대상 이름을 넣는다. */
export const List: Story = {
  render: () => (
    <ItemGroup aria-label="키오스크 기기" className="w-96 gap-2">
      {DEVICES.map((d) => (
        <Item key={d.id} variant="outline" size="sm" role="listitem">
          <ItemContent>
            <ItemTitle>
              {d.name}
              {d.active ? <Badge>사용 중</Badge> : <Badge variant="outline">폐기함</Badge>}
            </ItemTitle>
            <ItemDescription className="tabular-nums">{d.prefix} · 11월 16일 발급</ItemDescription>
          </ItemContent>
          {d.active && (
            <ItemActions>
              <Button size="sm" variant="ghost" aria-label={`${d.name} 토큰 폐기`}>
                <Trash2 />
                폐기
              </Button>
            </ItemActions>
          )}
        </Item>
      ))}
    </ItemGroup>
  ),
};
