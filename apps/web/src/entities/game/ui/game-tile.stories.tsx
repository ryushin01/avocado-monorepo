import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CATALOG_GAMES } from "@avocado/domain/catalog";

import { GameTile, GameTileSkeleton } from "./game-tile";

const meta = {
  title: "홈페이지/GameTile",
  component: GameTile,
  args: { game: CATALOG_GAMES[0], sizes: "240px" },
  decorators: [(Story) => <div className="w-60"><Story /></div>],
} satisfies Meta<typeof GameTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 유형별 목록의 게임 칸. 표지가 도착할 때까지 자리표시를 보인다. */
export const Default: Story = {};

export const Loading: Story = { render: () => <GameTileSkeleton /> };
