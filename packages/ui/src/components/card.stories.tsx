import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = { title: "부품/Card", component: Card } satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>강남점</CardTitle>
        <CardDescription>서울 강남구 · 매일 11:00–23:00</CardDescription>
        <CardAction>
          <Badge>운영 중</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>보유 게임 120종 · 지금 이용 가능 96종</p>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">
          매장 정보 보기
        </Button>
      </CardFooter>
    </Card>
  ),
};
