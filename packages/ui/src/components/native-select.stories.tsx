import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { errorIdOf, fieldA11y } from "../lib/field-a11y";
import { Field, FieldError, FieldLabel } from "./field";
import { NativeSelect, NativeSelectOption } from "./native-select";

const meta = {
  title: "부품/NativeSelect",
  component: NativeSelect,
  decorators: [(Story) => <div className="w-64"><Story /></div>],
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 브라우저 기본 선택 상자. JS 없이 동작하고, 휴대전화에서는 기기의 선택 창이 열린다(홈페이지 온라인 예약). */
export const Default: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="native-select-people">인원</FieldLabel>
      <NativeSelect id="native-select-people" name="people" defaultValue="2" className="w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <NativeSelectOption key={n} value={n}>
            {n}명
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  ),
};

/** 고르지 않고 보내면 오류 문구를 잇는다. 첫 옵션은 고를 수 없는 안내다. */
export const Invalid: Story = {
  render: () => (
    <Field data-invalid>
      <FieldLabel htmlFor="native-select-cafe">매장</FieldLabel>
      <NativeSelect
        id="native-select-cafe"
        name="cafe"
        defaultValue=""
        className="w-full"
        {...fieldA11y("native-select-cafe", true)}
      >
        <NativeSelectOption value="" disabled>
          매장을 골라 주세요
        </NativeSelectOption>
        <NativeSelectOption value="c_gangnam">강남점</NativeSelectOption>
        <NativeSelectOption value="c_pangyo">판교점</NativeSelectOption>
      </NativeSelect>
      <FieldError id={errorIdOf("native-select-cafe")} errors={[{ message: "매장을 골라 주세요." }]} />
    </Field>
  ),
};
