import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Field, FieldLabel } from "./field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const ITEMS = [
  { value: "confirmed", label: "확정" },
  { value: "pending", label: "가예약" },
];

const meta = { title: "부품/Select", component: Select } satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 목록이 짧고 모양을 맞춰야 하는 곳에 쓴다. 손님 화면처럼 JS를 줄여야 하면 NativeSelect를 쓴다. */
export const Default: Story = {
  render: () => (
    <Field className="w-60">
      <FieldLabel htmlFor="select-status">상태</FieldLabel>
      <Select name="status" items={ITEMS} defaultValue="confirmed">
        <SelectTrigger id="select-status" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  ),
};
