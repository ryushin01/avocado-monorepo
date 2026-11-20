import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar, AvatarFallback, AvatarGroup } from "./avatar";

const meta = { title: "부품/Avatar", component: Avatar } satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 사진이 없으면 이름의 첫 글자를 보인다. 이름은 옆 글자가 전하므로 꾸밈으로 둔다. */
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>김</AvatarFallback>
      </Avatar>
      <span className="text-sm">김매니저</span>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {["김", "이", "박"].map((initial) => (
        <Avatar key={initial}>
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  ),
};
