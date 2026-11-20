import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { descriptionIdOf, errorIdOf, fieldA11y } from "../lib/field-a11y";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";

const meta = {
  title: "부품/Input",
  component: Input,
  args: { type: "tel", inputMode: "tel", placeholder: "010-1234-5678" },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 입력 칸은 늘 라벨과 짝을 짓는다(placeholder만으로 라벨을 대신하지 않음). */
export const Default: Story = {
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="input-default">휴대전화</FieldLabel>
      <Input id="input-default" {...args} />
    </Field>
  ),
};

export const WithDescription: Story = {
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="input-help">휴대전화</FieldLabel>
      <Input id="input-help" {...args} {...fieldA11y("input-help", false, { described: true })} />
      <FieldDescription id={descriptionIdOf("input-help")}>키오스크에서 뒷자리 4자리로 예약을 확인합니다.</FieldDescription>
    </Field>
  ),
};

/** 잘못된 값이면 aria-invalid와 오류 문구를 잇는다(KWCAG 7.3.1, fieldA11y). */
export const Invalid: Story = {
  render: (args) => (
    <Field data-invalid>
      <FieldLabel htmlFor="input-invalid">휴대전화</FieldLabel>
      <Input id="input-invalid" defaultValue="02-123-4567" {...args} {...fieldA11y("input-invalid", true)} />
      <FieldError id={errorIdOf("input-invalid")} errors={[{ message: "010으로 시작하는 휴대전화 번호를 입력해주세요." }]} />
    </Field>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="input-disabled">휴대전화</FieldLabel>
      <Input id="input-disabled" defaultValue="010-1234-5678" disabled {...args} />
    </Field>
  ),
};
