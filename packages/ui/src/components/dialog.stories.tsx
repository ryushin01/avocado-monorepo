import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Field, FieldGroup, FieldLabel } from "./field";
import { Input } from "./input";

const meta = { title: "부품/Dialog", component: Dialog } satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function ReservationDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger render={<Button />}>예약 등록</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>예약 등록</DialogTitle>
          <DialogDescription>전화 등으로 받은 예약을 기록합니다.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dialog-name">이름</FieldLabel>
            <Input id="dialog-name" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button>등록</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 열면 첫 칸으로 초점이 가고, Esc로 닫으면 연 버튼으로 돌아온다. */
export const Default: Story = { render: () => <ReservationDialog /> };

/** 연 상태(접근성 검사용, 문서 페이지에서는 뺌) */
export const Open: Story = { tags: ["!autodocs"], render: () => <ReservationDialog defaultOpen /> };
