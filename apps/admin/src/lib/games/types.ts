import type { GameCategory, GameDifficulty } from "@avocado/domain/catalog";

// 유형·난이도는 모든 앱이 함께 쓰는 공통 카탈로그 패키지에 있다.
export {
  GAME_CATEGORIES,
  GAME_CATEGORY_LABELS,
  GAME_DIFFICULTIES,
  GAME_DIFFICULTY_LABELS,
  type GameCategory,
  type GameDifficulty,
} from "@avocado/domain/catalog";

/** 본사 공통 카탈로그의 보드게임. 매장별 보유 수량·상태는 inventory에서 관리한다. */
export type BoardGame = {
  id: string;
  /** BoardGameGeek ID (외부 데이터에서 가져온 경우) */
  bggId?: number;
  name: string;
  englishName?: string;
  /** 원본 이미지 주소 (관리자가 입력하거나 avocado 데이터에서 가져온 값) */
  imageUrl?: string;
  /**
   * 목록용 작은 썸네일 (public 아래 경로). scripts/import-avocado-images.mjs가 avocado 게임의
   * 원본 이미지로 만든다. 없으면 원본 이미지를 그대로 쓴다.
   */
  thumbnailUrl?: string;
  categories: GameCategory[];
  minPlayers: number;
  maxPlayers: number;
  playTimeMin: number;
  playTimeMax: number;
  difficulty: GameDifficulty;
  createdAt: string;
};

export type GameListFilter = {
  q?: string;
  category?: GameCategory;
};

/** 카탈로그 목록에서 함께 보여주는 매장 보유 현황 */
export type GameHolding = { cafeCount: number; quantity: number };

export type CatalogEntry = BoardGame & { holding: GameHolding };
