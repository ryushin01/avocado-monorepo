import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = { title: "부품/Label", component: Label } satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 라벨은 htmlFor로 칸과 잇는다. 라벨을 눌러도 칸이 바뀐다. */
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="label-remember" />
      <Label htmlFor="label-remember">로그인 상태 유지</Label>
    </div>
  ),
};
