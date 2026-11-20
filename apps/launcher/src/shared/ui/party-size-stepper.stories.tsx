import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PartySizeStepper } from "./party-size-stepper";

const meta = {
  title: "키오스크/PartySizeStepper",
  component: PartySizeStepper,
  args: { name: "partySize", defaultValue: 2, labelledBy: "party-label" },
} satisfies Meta<typeof PartySizeStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 인원을 −·+ 버튼으로 바꾼다. 이름은 화면의 '인원' 라벨에서 받는다(labelledBy). */
export const Default: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <span id="party-label" className="text-base font-medium">
        인원
      </span>
      <PartySizeStepper {...args} />
    </div>
  ),
};
