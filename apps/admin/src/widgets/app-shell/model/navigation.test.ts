import { describe, expect, it } from "vitest";

import { findNavItem, getNavItemsFor } from "./navigation";

describe("getNavItemsFor", () => {
  it("관리자는 모든 메뉴를 본다", () => {
    expect(getNavItemsFor({ role: "admin" }).map((i) => i.href)).toEqual([
      "/",
      "/stats",
      "/games",
      "/inventory",
      "/plays",
      "/reservations",
      "/cafes",
      "/staff",
      "/audit",
    ]);
  });

  it("스태프는 관리자 전용 메뉴를 보지 못한다", () => {
    expect(getNavItemsFor({ role: "staff" }).map((i) => i.href)).toEqual([
      "/",
      "/stats",
      "/games",
      "/inventory",
      "/plays",
      "/reservations",
    ]);
  });
});

describe("findNavItem", () => {
  it("하위 경로도 상위 메뉴로 매칭한다", () => {
    expect(findNavItem("/games/123")?.href).toBe("/games");
  });

  it("루트는 정확히 일치할 때만 대시보드로 매칭한다", () => {
    expect(findNavItem("/")?.href).toBe("/");
    expect(findNavItem("/unknown")).toBeUndefined();
  });
});
