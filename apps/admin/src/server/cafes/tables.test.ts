import { describe, expect, it } from "vitest";

import type { New } from "@/db/mappers";
import { createTestDb } from "@/db/testing";
import type { Cafe } from "@/entities/cafe";
import { cafeTableInputSchema } from "@/entities/cafe/index.server";

import { createCafeTableRepository } from "./tables";

const cafe = (id: string): New<Cafe> => ({ id, name: id, region: "", openedAt: "2024-01-01", status: "open" });
const now = new Date("2026-11-05T06:00:00.000Z");

async function setup() {
  // 테이블을 주지 않으면 매장마다 시드 배치(A1~A4 2인, B1~B4 4인, C1~C2 6인)가 들어간다.
  const db = await createTestDb({ cafes: [cafe("a"), cafe("b")], games: [], inventory: [], plays: [], users: [], reservations: [], waitlist: [] });
  return createCafeTableRepository(db);
}

describe("CafeTableRepository", () => {
  it("매장의 테이블을 이름순(숫자는 크기순)으로 준다", async () => {
    const tables = await setup();
    await tables.add("a", { label: "A10", seats: 2 }, now);
    const labels = (await tables.list("a")).map((t) => t.label);
    expect(labels).toEqual(["A1", "A2", "A3", "A4", "A10", "B1", "B2", "B3", "B4", "C1", "C2"]);
  });

  it("같은 매장에 같은 이름(공백·대소문자 무시)이 있으면 더하지 않는다", async () => {
    const tables = await setup();
    expect(await tables.add("a", { label: "a 1", seats: 4 }, now)).toBe("duplicate-label");
    expect(await tables.add("b", { label: "창가 1", seats: 4 }, now)).toMatchObject({ cafeId: "b", label: "창가 1", seats: 4, active: true });
    expect(await tables.add("없는매장", { label: "D1", seats: 4 }, now)).toBe("not-found");
  });

  it("공백·대소문자만 다른 이름을 동시에 더해도 하나만 남는다", async () => {
    const tables = await setup();
    const results = await Promise.all([
      tables.add("a", { label: "D 9", seats: 4 }, now),
      tables.add("a", { label: "d9", seats: 4 }, now),
    ]);
    expect(results.filter((r) => r === "duplicate-label")).toHaveLength(1);
    expect((await tables.list("a")).filter((t) => t.label.replace(/\s/g, "").toLowerCase() === "d9")).toHaveLength(1);
  });

  it("쓰지 않게 된 테이블은 끄고 다시 켤 수 있으며, 다른 매장의 테이블은 바꾸지 않는다", async () => {
    const tables = await setup();
    expect(await tables.setActive("a", "t_a_A1", false)).toMatchObject({ label: "A1", active: false });
    expect(await tables.setActive("b", "t_a_A1", true)).toBe("not-found");
    expect((await tables.list("a")).find((t) => t.id === "t_a_A1")?.active).toBe(false);
    expect(await tables.setActive("a", "t_a_A1", true)).toMatchObject({ active: true });
  });
});

describe("cafeTableInputSchema", () => {
  it("이름은 앞뒤 공백을 지우고 12자까지, 좌석은 1~12석", () => {
    expect(cafeTableInputSchema.parse({ label: " B5 ", seats: "4" })).toEqual({ label: "B5", seats: 4 });
    expect(cafeTableInputSchema.safeParse({ label: " ", seats: "4" }).success).toBe(false);
    expect(cafeTableInputSchema.safeParse({ label: "가".repeat(13), seats: "4" }).success).toBe(false);
    expect(cafeTableInputSchema.safeParse({ label: "B5", seats: "0" }).success).toBe(false);
    expect(cafeTableInputSchema.safeParse({ label: "B5", seats: "13" }).success).toBe(false);
  });
});
