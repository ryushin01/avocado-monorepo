import { afterEach, describe, expect, it, vi } from "vitest";

import { withoutVisitorTracking } from "./sentry";

async function load(dsn?: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", dsn ?? "");
  return (await import("./sentry")).sentryOptions;
}

describe("sentryOptions", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("DSN이 없으면 보내지 않는다", async () => {
    expect((await load()).enabled).toBe(false);
  });

  it("DSN이 있으면 보낸다", async () => {
    expect((await load("https://key@example.ingest.sentry.io/1")).enabled).toBe(true);
  });

  it("방문자 정보를 모으지 않는다", async () => {
    const { dataCollection } = await load("https://key@example.ingest.sentry.io/1");
    expect(dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });

  it("오류 내용이 아닌 콜백 인수·거부 객체의 필드·주소 # 뒤는 지운다", async () => {
    const { beforeSend } = await load("https://key@example.ingest.sentry.io/1");
    expect(
      beforeSend({
        type: undefined,
        extra: { arguments: ["입력"], __serialized__: { email: "a@b.c" }, other: 1 },
        request: { url: "https://a.b/menu#token" },
      }),
    ).toEqual({ type: undefined, extra: { other: 1 }, request: { url: "https://a.b/menu" } });
  });
});

describe("withoutVisitorTracking", () => {
  it("방문 세션과 브레드크럼만 뺀다", () => {
    const integrations = [
      { name: "BrowserSession" },
      { name: "Breadcrumbs" },
      { name: "GlobalHandlers" },
    ];
    expect(withoutVisitorTracking(integrations)).toEqual([{ name: "GlobalHandlers" }]);
  });
});
