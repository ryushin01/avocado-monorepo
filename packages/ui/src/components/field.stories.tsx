import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { errorIdOf, fieldA11y } from "../lib/field-a11y";
import { Button } from "./button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "./field";
import { Input } from "./input";

const meta = {
  title: "부품/Field",
  component: Field,
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 폼은 FieldSet·FieldLegend로 묶고, 칸마다 라벨·도움말·오류를 Field 안에 둔다. */
export const Form: Story = {
  render: () => (
    <form noValidate className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend>손님 정보</FieldLegend>
        <FieldDescription>전화로 받은 예약을 기록합니다.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="field-name">이름</FieldLabel>
            <Input id="field-name" autoComplete="off" />
          </Field>
          <Field>
            <FieldLabel htmlFor="field-party">인원</FieldLabel>
            <Input id="field-party" type="number" inputMode="numeric" min={1} defaultValue={2} />
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button type="submit" className="self-start">
        등록
      </Button>
    </form>
  ),
};

/** 서버가 돌려준 칸 오류. 첫 오류 칸으로 초점을 옮기는 것은 쓰는 쪽이 한다. */
export const WithErrors: Story = {
  render: () => (
    <FieldGroup>
      <Field data-invalid>
        <FieldLabel htmlFor="field-error-name">이름</FieldLabel>
        <Input id="field-error-name" {...fieldA11y("field-error-name", true)} />
        <FieldError id={errorIdOf("field-error-name")} errors={[{ message: "이름을 입력해주세요." }]} />
      </Field>
      <Field data-invalid>
        <FieldLabel htmlFor="field-error-party">인원</FieldLabel>
        <Input id="field-error-party" type="number" defaultValue={0} {...fieldA11y("field-error-party", true)} />
        <FieldError id={errorIdOf("field-error-party")} errors={[{ message: "인원은 1명 이상이어야 합니다." }]} />
      </Field>
    </FieldGroup>
  ),
};
