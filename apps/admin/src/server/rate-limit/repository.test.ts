import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/testing";

import { createRateLimiter } from "./repository";

const rule = { limit: 3, windowMs: 60_000 };
const start = new Date("2026-11-05T06:00:00.000Z");
const later = (ms: number) => new Date(start.getTime() + ms);

describe("createRateLimiter", () => {
  it("한도까지 허용하고, 넘으면 구간이 끝날 때까지 남은 초를 알려 준다", async () => {
    const limiter = createRateLimiter(await createTestDb());
    for (let i = 0; i < 3; i++) {
      expect(await limiter.consume("a", rule, start)).toEqual({ allowed: true });
    }
    expect(await limiter.consume("a", rule, later(15_000))).toEqual({
      allowed: false,
      retryAfterSeconds: 45,
    });
  });

  it("구간이 지나면 처음부터 다시 센다", async () => {
    const limiter = createRateLimiter(await createTestDb());
    for (let i = 0; i < 4; i++) await limiter.consume("a", rule, start);

    expect(await limiter.consume("a", rule, later(60_000))).toEqual({ allowed: true });
    expect(await limiter.consume("a", rule, later(61_000))).toEqual({ allowed: true });
    expect(await limiter.consume("a", rule, later(62_000))).toEqual({ allowed: true });
    expect((await limiter.consume("a", rule, later(63_000))).allowed).toBe(false);
  });

  it("키마다 따로 센다", async () => {
    const limiter = createRateLimiter(await createTestDb());
    for (let i = 0; i < 4; i++) await limiter.consume("a", rule, start);
    expect(await limiter.consume("b", rule, start)).toEqual({ allowed: true });
  });

  it("동시에 들어온 요청도 빠짐없이 센다", async () => {
    const limiter = createRateLimiter(await createTestDb());
    const results = await Promise.all(
      Array.from({ length: 6 }, () => limiter.consume("a", rule, start)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });
});
