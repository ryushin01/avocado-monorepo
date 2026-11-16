import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/testing";
import { loginAttempts } from "@/db/schema";

import {
  createLoginAttemptRepository,
  LOCK_MINUTES,
  MAX_FAILURES,
} from "./login-attempts";

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

  it("동시에 보낸 실패도 빠짐없이 세어 잠근다", async () => {
    const repo = await setup();
    // 읽고 나서 쓰면 20개가 모두 같은 횟수를 읽어 1번으로만 남았다.
    const results = await Promise.all(
      Array.from({ length: 20 }, () => repo.recordFailure("race@example.com", later(1))),
    );
    expect(results.filter((until) => until !== null)).toHaveLength(20 - MAX_FAILURES + 1);
    expect(await repo.lockedUntil("race@example.com", later(2))).toEqual(later(1 + LOCK_MINUTES));
  });

  it("기간이 지나고 잠금도 풀린 기록은 다음 실패 때 지운다", async () => {
    const db = await createTestDb({ plays: [], reservations: [], waitlist: [] }, t0);
    const repo = createLoginAttemptRepository(db);
    await repo.recordFailure("old@example.com", later(0));
    for (let i = 1; i <= MAX_FAILURES; i++) await repo.recordFailure("locked@example.com", later(i));
    // 잠금이 남은 기록은 두고, 15분 넘게 지난 기록만 지운다.
    await repo.recordFailure("new@example.com", later(16));
    const emails = (await db.select({ email: loginAttempts.email }).from(loginAttempts)).map((r) => r.email);
    expect(emails.sort()).toEqual(["locked@example.com", "new@example.com"]);
  });
});
