import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { descriptionIdOf, errorIdOf, fieldA11y } from "../lib/field-a11y";
import { Checkbox } from "./checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "./field";

const meta = {
  title: "부품/Checkbox",
  component: Checkbox,
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="checkbox-default" name="newsletter" />
      <FieldLabel htmlFor="checkbox-default">새 게임 소식 받기</FieldLabel>
    </Field>
  ),
};

export const Checked: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="checkbox-checked" defaultChecked />
      <FieldLabel htmlFor="checkbox-checked">로그인 상태 유지</FieldLabel>
    </Field>
  ),
};

/** 온라인 예약의 개인정보 동의처럼 필수 동의를 빠뜨리면 오류 문구를 잇는다. */
export const Invalid: Story = {
  render: () => (
    <Field orientation="horizontal" data-invalid>
      <Checkbox id="checkbox-agree" {...fieldA11y("checkbox-agree", true, { described: true })} />
      <FieldContent>
        <FieldLabel htmlFor="checkbox-agree">개인정보 수집·이용에 동의합니다 (필수)</FieldLabel>
        <FieldDescription id={descriptionIdOf("checkbox-agree")}>
          예약 확인과 방문 안내를 위해 이름과 휴대전화 번호를 받습니다.
        </FieldDescription>
        <FieldError id={errorIdOf("checkbox-agree")} errors={[{ message: "개인정보 수집·이용에 동의해주세요." }]} />
      </FieldContent>
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="checkbox-disabled" disabled />
      <FieldLabel htmlFor="checkbox-disabled">폐점한 매장 보기</FieldLabel>
    </Field>
  ),
};
