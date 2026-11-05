import { describe, expect, it } from "vitest";

import staticImageLoader from "./image-loader";

describe("staticImageLoader", () => {
  it("외부 주소는 그대로 둔다", () => {
    expect(staticImageLoader({ src: "https://example.com/a.png", width: 100 })).toBe("https://example.com/a.png");
  });

  it("사이트 안의 파일은 경로를 유지한다", () => {
    expect(staticImageLoader({ src: "/images/a.png", width: 100 })).toMatch(/\/images\/a\.png$/);
  });
});
