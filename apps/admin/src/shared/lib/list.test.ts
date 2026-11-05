import { describe, expect, it } from "vitest";

import { buildListHref, getPageWindow, parsePage, slice } from "./list";

describe("getPageWindow", () => {
  it("페이지가 적으면 모두 나열한다", () => {
    expect(getPageWindow(1, 1)).toEqual([1]);
    expect(getPageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("가운데 페이지는 양쪽을 말줄임한다", () => {
    expect(getPageWindow(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("처음·끝 근처에서는 한쪽만 말줄임한다", () => {
    expect(getPageWindow(1, 10)).toEqual([1, 2, "ellipsis", 10]);
    expect(getPageWindow(3, 10)).toEqual([1, 2, 3, 4, "ellipsis", 10]);
    expect(getPageWindow(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("말줄임이 한 페이지만 가리면 번호로 보여준다", () => {
    expect(getPageWindow(4, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    expect(getPageWindow(7, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
  });
});

describe("buildListHref", () => {
  it("조건을 유지하고 빈 값과 1페이지는 생략한다", () => {
    expect(buildListHref("/games", {}, 1)).toBe("/games");
    expect(
      buildListHref("/inventory", { cafe: "c_1", q: "카탄", status: undefined }, 3),
    ).toBe("/inventory?cafe=c_1&q=%EC%B9%B4%ED%83%84&page=3");
  });
});

describe("parsePage / slice", () => {
  it("1 이상의 정수만 페이지로 인정한다", () => {
    expect(parsePage({ page: "3" })).toBe(3);
    expect(parsePage({ page: "0" })).toBe(1);
    expect(parsePage({ page: "abc" })).toBe(1);
    expect(parsePage({})).toBe(1);
  });

  it("범위로 자르고 전체 개수를 함께 돌려준다", () => {
    expect(slice([1, 2, 3, 4, 5], { offset: 2, limit: 2 })).toEqual({
      items: [3, 4],
      total: 5,
    });
    expect(slice([1, 2])).toEqual({ items: [1, 2], total: 2 });
  });
});
