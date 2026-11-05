import { describe, expect, it } from "vitest";

import { createTestDb } from "@/db/testing";

import { createAuditRepository } from "./repository";

const actor = { id: "u_admin", name: "김관리" };

describe("AuditRepository", () => {
  it("최근 작업부터 보여 주고 매장 이름을 함께 돌려준다", async () => {
    const db = await createTestDb();
    const audit = createAuditRepository(db);
    await audit.record(actor, { action: "game.create", targetName: "새 게임" }, new Date("2026-01-01T00:00:00Z"));
    await audit.record(
      actor,
      { action: "inventory.update", targetName: "카탄", cafeId: "c_gangnam", detail: "수량 3개 → 5개" },
      new Date("2026-01-02T00:00:00Z"),
    );

    const { items, total } = await audit.list({ offset: 0, limit: 10 });

    expect(total).toBe(2);
    expect(items[0]).toMatchObject({
      at: "2026-01-02T00:00:00.000Z",
      actorId: "u_admin",
      actorName: "김관리",
      action: "inventory.update",
      targetName: "카탄",
      cafeId: "c_gangnam",
      cafeName: "강남점",
      detail: "수량 3개 → 5개",
    });
    expect(items[1]).toMatchObject({ action: "game.create" });
    expect(items[1].cafeId).toBeUndefined();
    expect(items[1].cafeName).toBeUndefined();
    expect(items[1].detail).toBeUndefined();
  });

  it("범위만큼 나눠 읽고 전체 개수는 그대로 알려 준다", async () => {
    const audit = createAuditRepository(await createTestDb());
    for (const day of [1, 2, 3]) {
      await audit.record(actor, { action: "game.update", targetName: `게임${day}` }, new Date(2026, 0, day));
    }

    const { items, total } = await audit.list({ offset: 1, limit: 1 });

    expect(total).toBe(3);
    expect(items.map((i) => i.targetName)).toEqual(["게임2"]);
  });
});
