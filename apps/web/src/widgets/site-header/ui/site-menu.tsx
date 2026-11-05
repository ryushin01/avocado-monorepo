import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { SiteMenuSheet } from "./site-menu-sheet";

/** 전체 화면 메뉴. 카탈로그가 브라우저 번들에 들어가지 않도록 유형 이름만 넘긴다. */
export function SiteMenu() {
  return <SiteMenuSheet categories={CATEGORY_INFO.map(({ key, label }) => ({ key, label }))} />;
}
