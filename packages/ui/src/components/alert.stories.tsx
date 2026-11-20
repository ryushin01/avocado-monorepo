import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Info, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = {
  title: "부품/Alert",
  component: Alert,
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>키오스크가 연결되지 않았습니다</AlertTitle>
      <AlertDescription>매장 태블릿의 인터넷 연결을 확인해 주세요.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>저장하지 못했습니다</AlertTitle>
      <AlertDescription>이 창을 연 뒤 다른 직원이 예약을 먼저 바꿨습니다. 창을 닫고 다시 고쳐 주세요.</AlertDescription>
    </Alert>
  ),
};
