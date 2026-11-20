import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Field, FieldLabel } from "./field";
import { Textarea } from "./textarea";

const meta = {
  title: "부품/Textarea",
  component: Textarea,
  args: { rows: 3, maxLength: 100 },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="textarea-memo">메모 (선택)</FieldLabel>
      <Textarea id="textarea-memo" placeholder="예: 창가 자리 원함" {...args} />
    </Field>
  ),
};
