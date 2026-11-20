import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";

import { Button } from "./button";
import { Toaster } from "./sonner";

const meta = { title: "부품/Toaster (sonner)", component: Toaster } satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 저장 결과처럼 잠깐 보이는 알림. 화면 낭독기에도 읽힌다. 밝은 테마로 고정한다. */
export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <div className="flex gap-2">
        <Button onClick={() => toast.success("'김철수' 예약을 등록했습니다.")}>성공 알림</Button>
        <Button variant="outline" onClick={() => toast.error("다른 직원이 먼저 이 예약을 바꿨습니다.")}>
          오류 알림
        </Button>
      </div>
    </>
  ),
};
