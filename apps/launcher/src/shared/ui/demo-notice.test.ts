import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoNotice } from "./demo-notice";

afterEach(() => vi.unstubAllEnvs());

describe("키오스크 데모 안내", () => {
  it("공개 데모에서는 이름 붙은 보조 랜드마크(aside) 안에 보여, 랜드마크 밖에 내용이 남지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");
    const html = renderToStaticMarkup(createElement(DemoNotice));
    expect(html).toMatch(/^<aside aria-label="공개 데모 안내"[^>]*>/);
    expect(html).toContain("공개 데모");
  });

  it("데모가 아니면 아무것도 그리지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(renderToStaticMarkup(createElement(DemoNotice))).toBe("");
  });
});
