import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FormErrorAlert } from "./form-error-alert";

const meta = {
  title: "백오피스/FormErrorAlert",
  component: FormErrorAlert,
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof FormErrorAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 폼 전체의 오류. 화면 낭독기가 읽도록 알림 영역은 오류가 없을 때도 있다(자리는 차지하지 않음). */
export const WithError: Story = {
  args: { message: "이 창을 연 뒤 다른 직원이 예약을 먼저 바꿨습니다. 창을 닫고 바뀐 내용을 확인한 뒤 다시 고쳐 주세요." },
};

export const Empty: Story = { args: {} };
