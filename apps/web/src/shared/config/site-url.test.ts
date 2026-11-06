import { afterEach, describe, expect, it, vi } from "vitest";

import { siteUrl } from "./site-url";

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("SITE_URL을 가장 먼저 쓴다", () => {
    vi.stubEnv("SITE_URL", "https://avocado.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "avocado.vercel.app");
    expect(siteUrl()).toBe("https://avocado.example");
  });

  it("끝의 슬래시를 뺀다", () => {
    vi.stubEnv("SITE_URL", "https://avocado.example/");
    expect(siteUrl()).toBe("https://avocado.example");
  });

  it("SITE_URL이 없으면 Vercel 운영 주소에 https를 붙인다", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "avocado.vercel.app");
    expect(siteUrl()).toBe("https://avocado.vercel.app");
  });

  it("둘 다 없으면 개발 주소를 쓴다", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl()).toBe("http://localhost:3002");
  });
});
