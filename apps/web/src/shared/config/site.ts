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
export const CATEGORY_BANNERS: Partial<Record<string, { src: string; alt: string; position: string }>> = {
  strategy: { src: "/images/banners/strategy.webp", alt: "쌓아 올린 나무 말", position: "50% 50%" },
  thematic: { src: "/images/banners/thematic.webp", alt: "붉은 용 피규어와 기사 피규어", position: "50% 42%" },
  abstract: { src: "/images/banners/abstract.webp", alt: "체스판 위에 늘어선 흰 체스 말", position: "50% 33%" },
  wargame: { src: "/images/banners/wargame.webp", alt: "카드 위에 놓인 주사위들", position: "50% 25%" },
};

/** 링크를 공유할 때 보이는 사진. 화면별 openGraph가 부모 값을 통째로 바꾸므로 파일 규칙 대신 주소를 직접 적는다. */
export const SHARE_IMAGE = {
  url: "/images/og.jpg",
  width: 1200,
  height: 630,
  alt: "지도 위에 흩어진 주사위와 말",
};

/** 메뉴와 바닥글의 사이트 안내 링크 */
export const SITE_LINKS = [
  { href: "/about", label: "브랜드 소개" },
  { href: "/about#stores", label: "매장 안내" },
  { href: "/about#franchise", label: "가맹 문의" },
] as const;

/** 가상의 매장. 백오피스 시드(apps/admin/src/server/cafes/seed.ts)와 같은 값이고, 영업시간도 지어낸 값이다. */
export const STORES = [
  { name: "강남점", address: "서울 강남구", phone: "02-0000-0001", hours: "매일 11:00–23:00" },
  { name: "홍대점", address: "서울 마포구", phone: "02-0000-0002", hours: "매일 11:00–24:00" },
  { name: "판교점", address: "경기 성남시 분당구", phone: "031-000-0003", hours: "매일 11:00–22:00" },
  { name: "대전 둔산점", address: "대전 서구", phone: "042-000-0004", hours: "매일 11:00–23:00" },
  { name: "부산 서면점", address: "부산 부산진구", phone: "051-000-0005", hours: "매일 11:00–23:00" },
] as const;

/** 가상의 가맹 문의 연락처 */
export const FRANCHISE_CONTACT = { email: "franchise@example.com", phone: "02-0000-0000" } as const;
