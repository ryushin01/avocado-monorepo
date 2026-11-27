import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/testing";
import { SEED_CAFES } from "@/server/cafes/seed";
import { SEED_USERS } from "@/server/auth/mock-users";

import { createAuditRepository } from "./repository";
import { createSeedAudit } from "./seed";

const now = new Date("2026-11-27T03:00:00Z");

describe("시드 변경 이력", () => {
  it("개발용 시드로 시작하면 변경 이력 화면에 지난 작업이 최근 것부터 보인다", async () => {
    const audit = createAuditRepository(await createTestDb({}, now));

    const { items, total } = await audit.list({ offset: 0, limit: 3 });

    expect(total).toBeGreaterThanOrEqual(5);
    expect(items[0]).toMatchObject({ actorName: "이스태프", action: "inventory.update", cafeName: "강남점" });
    expect(items.map((i) => i.at)).toEqual([...items.map((i) => i.at)].sort().reverse());
  });

  it("모두 now 이전·2년 보관 기간 안이고, 시드에 없는 직원·매장의 기록은 뺀다", () => {
    const all = createSeedAudit(SEED_USERS, SEED_CAFES, now);
    for (const log of all) {
      expect(log.at.getTime()).toBeLessThan(now.getTime());
      expect(now.getTime() - log.at.getTime()).toBeLessThan(365 * 86_400_000);
    }

    const onlyAdmin = createSeedAudit(
      SEED_USERS.filter((u) => u.id === "u_admin"),
      SEED_CAFES.filter((c) => c.id === "c_seomyeon"),
      now,
    );
    expect(onlyAdmin.length).toBeGreaterThan(0);
    expect(onlyAdmin.every((log) => log.actorId === "u_admin")).toBe(true);
    expect(onlyAdmin.every((log) => log.cafeId === null || log.cafeId === "c_seomyeon")).toBe(true);
  });
});
