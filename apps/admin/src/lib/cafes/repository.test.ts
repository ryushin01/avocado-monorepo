import { describe, expect, it } from "vitest";

import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db";
import { inventoryItems, playSessions } from "@/db/schema";
import { createTestDb } from "@/db/testing";

import { createCafeRepository } from "./repository";
import type { CafeInput } from "./schema";
import { cafeInputSchema } from "./schema";

const input = (patch: Partial<CafeInput> = {}): CafeInput => ({
  name: "제주점",
  region: "제주",
  openedAt: "2026-11-01",
  ...patch,
});

/** 그 매장의 이용 중 기록을 모두 반납 처리한다. */
const returnAll = (db: Database, cafeId: string) =>
  db
    .update(playSessions)
    .set({ returnedAt: new Date() })
    .where(and(eq(playSessions.cafeId, cafeId), isNull(playSessions.returnedAt)));

describe("CafeRepository", () => {
  it("등록하면 운영 중이고, 이름이 같으면(공백 무시) 등록·수정할 수 없다", async () => {
    const repo = createCafeRepository(await createTestDb({ plays: [] }));
    const created = await repo.create(input());
    expect(created).toMatchObject({ status: "open", name: "제주점" });
    expect(typeof created !== "string" && created.id).toMatch(/^c_/);
    expect(await repo.create(input({ name: "제주 점" }))).toBe("duplicate-name");
    expect(await repo.update("c_gangnam", input({ name: "홍대점" }))).toBe("duplicate-name");
    expect(await repo.update("nope", input({ name: "새 이름" }))).toBe("not-found");
  });

  it("수정하면 비운 선택 항목은 지우고 상태는 그대로 둔다", async () => {
    const repo = createCafeRepository(await createTestDb({ plays: [] }));
    const updated = await repo.update("c_gangnam", input({ name: "강남역점" }));
    expect(updated).toMatchObject({ name: "강남역점", status: "open" });
    expect(typeof updated !== "string" && updated.phone).toBeUndefined();
  });

  it("이용 중인 게임이 있으면 폐점할 수 없고, 모두 반납하면 폐점·재개할 수 있다", async () => {
    const db = await createTestDb();
    const repo = createCafeRepository(db);
    expect(await repo.setStatus("c_pangyo", "closed")).toBe("in-use");

    await returnAll(db, "c_pangyo");
    const closed = await repo.setStatus("c_pangyo", "closed");
    expect(closed).toMatchObject({ status: "closed" });
    expect(typeof closed !== "string" && closed.closedAt).toBeTruthy();

    // 재고와 기록은 그대로 남는다.
    expect((await db.select().from(inventoryItems).where(eq(inventoryItems.cafeId, "c_pangyo"))).length).toBeGreaterThan(0);
    const reopened = await repo.setStatus("c_pangyo", "open");
    expect(reopened).toMatchObject({ status: "open", closedAt: undefined });
  });

  it("개요: 운영 중 먼저, 보유 게임·재직 스태프·이용 중 수", async () => {
    const db = await createTestDb();
    const repo = createCafeRepository(db);
    await returnAll(db, "c_gangnam");
    await repo.setStatus("c_gangnam", "closed");
    const overview = await repo.overview();
    expect(overview.at(-1)?.id).toBe("c_gangnam");
    const gangnam = overview.at(-1)!;
    // 강남점 스태프는 이스태프(재직)와 정퇴사(퇴사)
    expect(gangnam).toMatchObject({ staffCount: 1, inUseCount: 0 });
    expect(gangnam.gameCount).toBe(
      (await db.select().from(inventoryItems).where(eq(inventoryItems.cafeId, "c_gangnam"))).length,
    );
    expect(overview[0].inUseCount).toBeGreaterThan(0);
  });
});

describe("cafeInputSchema", () => {
  it("이름·지역·개점일은 필수이고, 전화번호는 형식을 검사한다", () => {
    const result = cafeInputSchema.safeParse({
      name: " ",
      region: "",
      openedAt: "2026-13-01",
      phone: "12345",
      address: "",
    });
    expect(result.success).toBe(false);
    expect(Object.keys(result.error!.flatten().fieldErrors).sort()).toEqual([
      "name",
      "openedAt",
      "phone",
      "region",
    ]);
    expect(cafeInputSchema.parse({ ...input(), phone: "", address: "" })).toEqual(input());
  });
});
