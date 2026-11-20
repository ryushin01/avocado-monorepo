import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card, CardContent } from "./card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./carousel";

const GAMES = ["카탄", "스플렌더", "윙스팬"];

const meta = {
  title: "부품/Carousel",
  component: Carousel,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 이전·다음 버튼과 방향키로 넘긴다. 영역에 이름을 준다. */
export const Default: Story = {
  render: () => (
    <div className="flex justify-center px-14">
      <Carousel className="w-72" opts={{ loop: true }} aria-label="추천 게임">
        <CarouselContent>
          {GAMES.map((name) => (
            <CarouselItem key={name}>
              <Card>
                <CardContent className="flex aspect-video items-center justify-center text-lg font-bold">{name}</CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};
