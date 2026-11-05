import { afterEach, describe, expect, it, vi } from "vitest";

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
});
