"use client";

import { createContext, type ReactNode, use } from "react";

export interface MenuCategory {
  key: string;
  label: string;
}

const MenuCategories = createContext<MenuCategory[]>([]);

/**
 * 루트 레이아웃이 유형 이름만 내려 준다. 오류 화면처럼 클라이언트 컴포넌트에서도 메뉴를 쓰되,
 * 카탈로그 전체가 브라우저 번들에 들어가지 않게 하기 위해서다.
 */
export function SiteMenuProvider({ categories, children }: { categories: MenuCategory[]; children: ReactNode }) {
  return <MenuCategories value={categories}>{children}</MenuCategories>;
}

export const useMenuCategories = () => use(MenuCategories);
