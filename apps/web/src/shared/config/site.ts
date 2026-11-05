/** 브랜드 정보. 이름이 정해지면 여기만 바꾼다. */
export const BRAND = {
  name: "아보카도 보드게임 카페",
  shortName: "아보카도",
  /** 머리글의 로고 글자 */
  wordmark: "avocado",
  tagline: "보드게임, 함께라서 더 즐겁게",
  description:
    "전략·테마·가족·파티 게임까지, 엄선한 보드게임을 가까운 매장에서 바로 즐겨보세요.",
};

/** 홈 화면 큰 사진 (avocado의 메인 사진) */
export const HERO_IMAGES = [
  { src: "/images/hero/hero-1.webp", alt: "체스판 위에 놓인 나무 말" },
  { src: "/images/hero/hero-2.webp", alt: "지도 위에 흩어진 주사위" },
  { src: "/images/hero/hero-3.webp", alt: "주사위와 나무 일꾼 말" },
  { src: "/images/hero/hero-4.webp", alt: "육각형 타일 보드 위의 말과 주사위" },
  { src: "/images/hero/hero-5.webp", alt: "카드와 말이 놓인 보드게임 테이블" },
] as const;

/** 유형 소개 사이에 넣는 사진 (avocado의 이벤트 사진) */
export const CATEGORY_BANNERS: Partial<Record<string, { src: string; alt: string }>> = {
  strategy: { src: "/images/banners/strategy.webp", alt: "큰 지도 보드를 펼쳐 놓고 플레이하는 모습" },
  thematic: { src: "/images/banners/thematic.webp", alt: "붉은 용 피규어와 기사 피규어" },
  abstract: { src: "/images/banners/abstract.webp", alt: "나무 판 위에 구슬을 옮기는 손" },
  wargame: { src: "/images/banners/wargame.webp", alt: "카드 위에 놓인 주사위들" },
};
