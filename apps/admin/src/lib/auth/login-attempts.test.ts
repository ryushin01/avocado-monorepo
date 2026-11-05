import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/testing";

import { createLoginAttemptRepository, LOCK_MINUTES, MAX_FAILURES } from "./login-attempts";

const t0 = new Date("2026-11-05T06:00:00.000Z");
const later = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);
const setup = async () =>
  createLoginAttemptRepository(await createTestDb({ plays: [], reservations: [], waitlist: [] }, t0));

describe("로그인 연속 실패 잠금", () => {
  it("5번 틀리면 15분 잠기고, 대소문자·공백이 달라도 같은 이메일로 센다", async () => {
    const repo = await setup();
    for (let i = 1; i < MAX_FAILURES; i++) {
      expect(await repo.recordFailure(i % 2 ? "Admin@Example.com " : "admin@example.com", later(i))).toBeNull();
    }
    const until = await repo.recordFailure("admin@example.com", later(MAX_FAILURES));
    expect(until).toEqual(later(MAX_FAILURES + LOCK_MINUTES));
    expect(await repo.lockedUntil("ADMIN@example.com", later(MAX_FAILURES + 1))).toEqual(until);
    // 잠금이 풀리면 처음부터 다시 센다.
    expect(await repo.lockedUntil("admin@example.com", later(MAX_FAILURES + LOCK_MINUTES + 1))).toBeNull();
    expect(await repo.recordFailure("admin@example.com", later(MAX_FAILURES + LOCK_MINUTES + 1))).toBeNull();
  });

  it("성공하면 기록을 지우고, 15분 넘게 지난 실패는 이어서 세지 않는다", async () => {
    const repo = await setup();
    for (let i = 0; i < MAX_FAILURES - 1; i++) await repo.recordFailure("a@example.com", later(i));
    await repo.recordSuccess("a@example.com");
    expect(await repo.recordFailure("a@example.com", later(10))).toBeNull();

    for (let i = 0; i < MAX_FAILURES - 1; i++) await repo.recordFailure("b@example.com", later(i));
    expect(await repo.recordFailure("b@example.com", later(MAX_FAILURES + LOCK_MINUTES))).toBeNull();
  });
});
