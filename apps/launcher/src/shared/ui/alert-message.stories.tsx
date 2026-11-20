import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AlertMessage } from "./alert-message";

const meta = {
  title: "키오스크/AlertMessage",
  component: AlertMessage,
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof AlertMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 손님에게 보여 주는 오류. 알림 영역은 처음부터 있고 내용만 바뀐다(비어 있으면 자리를 차지하지 않음). */
export const WithError: Story = { args: { message: "예약을 찾을 수 없습니다. 번호를 다시 확인해 주세요." } };

export const Empty: Story = { args: {} };
