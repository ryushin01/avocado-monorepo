// 분류 체계와 이름은 avocado 프로젝트의 boardgameTypeData.json(BoardGameGeek 유형)을
// 그대로 따른다. scripts/import-avocado.mjs가 원본과 일치하는지 검사한다.
export const GAME_CATEGORIES = [
  "strategy",
  "thematic",
  "family",
  "party",
  "abstract",
  "wargame",
  "customizable",
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  strategy: "전략 게임",
  thematic: "테마 게임",
  family: "가족 게임",
  party: "파티 게임",
  abstract: "추상 전략 게임",
  wargame: "워게임",
  customizable: "컬렉터블 게임",
};

export const GAME_DIFFICULTIES = ["easy", "normal", "hard"] as const;

export type GameDifficulty = (typeof GAME_DIFFICULTIES)[number];

export const GAME_DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

/** 유형 소개 (avocado 유형별 데이터의 설명) */
export type CategoryInfo = {
  key: GameCategory;
  label: string;
  /** BoardGameGeek 유형 이름 (예: Strategy) */
  bggType: string;
  description: string;
};

/**
 * 본사 카탈로그의 원본 게임 정보 (avocado 데이터 변환 결과).
 * 백오피스는 이 중 필요한 항목만 카탈로그 시드로 쓰고, 홍보 사이트는 전부 보여준다.
 */
export type CatalogGame = {
  bggId: number;
  /** BoardGameGeek 순위 (avocado 데이터 기준) */
  rank: number;
  name: string;
  englishName: string;
  /** 원본 이미지 (BoardGameGeek) */
  imageUrl: string;
  /** 로컬 썸네일 경로. 각 앱의 public/images/games 아래로 복사된다. */
  thumbnailUrl?: string;
  yearReleased: number;
  designers: string[];
  categories: GameCategory[];
  /** 세부 분류 (예: 모험, 판타지) */
  tags: string[];
  minPlayers: number;
  maxPlayers: number;
  /** 추천 인원 (예: "3", "3-4") */
  bestPlayers: string;
  playTimeMin: number;
  playTimeMax: number;
  minAge: number;
  /** BoardGameGeek 평균 평점 (10점 만점) */
  rating: number;
  /** BoardGameGeek 평균 난이도 (5점 만점) */
  weight: number;
  difficulty: GameDifficulty;
  /** 한국어판 출시 여부 */
  koreanEdition: boolean;
};

export type CatalogData = {
  categories: CategoryInfo[];
  games: CatalogGame[];
};
