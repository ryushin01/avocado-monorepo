import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@avocado/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";

import { DialogFormFooter } from "./dialog-form-footer";

const meta = {
  title: "백오피스/DialogFormFooter",
  component: DialogFormFooter,
  args: { submitLabel: "등록", pending: false },
  // 대화상자 안의 버튼 줄이라 열린 대화상자로 보여 준다.
  decorators: [
    (Story) => (
      <Dialog defaultOpen>
        <DialogTrigger render={<Button variant="outline" />}>예약 등록 창 열기</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>예약 등록</DialogTitle>
            <DialogDescription>전화 등으로 받은 예약을 기록합니다.</DialogDescription>
          </DialogHeader>
          <Story />
        </DialogContent>
      </Dialog>
    ),
  ],
  tags: ["!autodocs"],
} satisfies Meta<typeof DialogFormFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 보내는 동안에는 버튼을 막아 두 번 보내지 않는다. */
export const Pending: Story = { args: { pending: true } };
