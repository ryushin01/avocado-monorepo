import { describe, expect, it } from "vitest";

import { auditLogs, loginAttempts, rateLimits, reservations, waitlistEntries } from "@/db/schema";
import { createTestDb } from "@/db/testing";
import { DAY } from "@/shared/lib/kst-time";

import { createRetentionRepository, RETENTION_DAYS } from "./repository";

const now = new Date("2026-11-16T03:00:00.000Z");
const ago = (days: number, extraMs = 0) => new Date(now.getTime() - days * DAY - extraMs);
const guest = { cafeId: "c_gangnam", name: "김철수", phone: "01012345678", partySize: 2 };

async function setup() {
  const db = await createTestDb({ plays: [], reservations: [], waitlist: [] }, now);
  const insertReservation = (id: string, startsAt: Date) =>
    db.insert(reservations).values({ ...guest, id, startsAt, status: "seated", createdAt: startsAt });
  const insertWaitlist = (id: string, createdAt: Date) =>
    db.insert(waitlistEntries).values({ ...guest, id, number: 1, status: "seated", createdAt });
  return { db, insertReservation, insertWaitlist, repo: createRetentionRepository(db) };
}

describe("RetentionRepository", () => {
  it("보관 기간이 지난 손님 예약·대기만 지우고, 기간 안의 것은 남긴다", async () => {
    const { db, insertReservation, insertWaitlist, repo } = await setup();
    await insertReservation("r_old", ago(RETENTION_DAYS.guests, 1));
    await insertReservation("r_keep", ago(RETENTION_DAYS.guests - 1));
    await insertReservation("r_future", new Date(now.getTime() + DAY));
    await insertWaitlist("w_old", ago(RETENTION_DAYS.guests + 10));
    await insertWaitlist("w_keep", ago(3));

    const removed = await repo.prune(now);

    expect(removed).toMatchObject({ reservations: 1, waitlistEntries: 1 });
    expect((await db.select().from(reservations)).map((r) => r.id).sort()).toEqual(["r_future", "r_keep"]);
    expect((await db.select().from(waitlistEntries)).map((w) => w.id)).toEqual(["w_keep"]);
  });

  it("변경 이력은 2년, 로그인 실패·요청 제한 횟수는 하루가 지나면 지운다", async () => {
    const { db, repo } = await setup();
    const audit = { actorId: "u_admin", actorName: "김관리", action: "game.create" as const, targetName: "카탄" };
    await db.insert(auditLogs).values([
      { ...audit, id: "a_old", at: ago(RETENTION_DAYS.audit, 1) },
      { ...audit, id: "a_keep", at: ago(RETENTION_DAYS.audit - 1) },
    ]);
    await db.insert(loginAttempts).values([
      { email: "old@example.com", failures: 2, lastFailedAt: ago(2) },
      { email: "now@example.com", failures: 1, lastFailedAt: ago(0, 60_000) },
    ]);
    await db.insert(rateLimits).values([
      { key: "kiosk:old", count: 3, windowStartedAt: ago(2) },
      { key: "kiosk:now", count: 3, windowStartedAt: ago(0, 30_000) },
    ]);

    expect(await repo.prune(now)).toEqual({ reservations: 0, waitlistEntries: 0, auditLogs: 1, loginAttempts: 1, rateLimits: 1 });
    expect((await db.select().from(auditLogs)).map((a) => a.id)).toEqual(["a_keep"]);
    expect((await db.select().from(loginAttempts)).map((a) => a.email)).toEqual(["now@example.com"]);
    expect((await db.select().from(rateLimits)).map((r) => r.key)).toEqual(["kiosk:now"]);
    // 다시 불러도 더 지울 것이 없다.
    expect(await repo.prune(now)).toEqual({ reservations: 0, waitlistEntries: 0, auditLogs: 0, loginAttempts: 0, rateLimits: 0 });
  });
});
