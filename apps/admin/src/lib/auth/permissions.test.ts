import { describe, expect, it } from "vitest";

import { SEED_CAFES } from "@/lib/cafes/seed";

import {
  canManageCatalog,
  canManageInventory,
  resolveCafe,
  visibleCafes,
} from "./permissions";

const admin = { role: "admin" as const };
const staff = { role: "staff" as const, cafeId: "c_hongdae" };

describe("permissions", () => {
  it("카탈로그는 관리자만 관리한다", () => {
    expect(canManageCatalog(admin)).toBe(true);
    expect(canManageCatalog(staff)).toBe(false);
  });

  it("재고는 관리자는 모든 매장, 스태프는 소속 매장만 관리한다", () => {
    expect(canManageInventory(admin, "c_gangnam")).toBe(true);
    expect(canManageInventory(staff, "c_hongdae")).toBe(true);
    expect(canManageInventory(staff, "c_gangnam")).toBe(false);
  });

  it("스태프는 소속 매장만 볼 수 있다", () => {
    expect(visibleCafes(admin, SEED_CAFES)).toHaveLength(SEED_CAFES.length);
    expect(visibleCafes(staff, SEED_CAFES).map((c) => c.id)).toEqual(["c_hongdae"]);
  });

  it("스태프가 다른 매장을 요청해도 소속 매장을 보여준다", () => {
    expect(resolveCafe(staff, SEED_CAFES, "c_gangnam")?.id).toBe("c_hongdae");
  });

  it("폐점한 매장은 보이지 않는다 (스태프의 소속 매장이 폐점하면 볼 매장이 없다)", () => {
    const cafes = SEED_CAFES.map((c) =>
      c.id === "c_hongdae" ? { ...c, status: "closed" as const } : c,
    );
    expect(visibleCafes(admin, cafes).map((c) => c.id)).not.toContain("c_hongdae");
    expect(resolveCafe(admin, cafes, "c_hongdae")?.id).toBe("c_gangnam");
    expect(resolveCafe(staff, cafes)).toBeNull();
  });

  it("관리자는 요청한 매장, 잘못된 요청이면 첫 매장을 본다", () => {
    expect(resolveCafe(admin, SEED_CAFES, "c_pangyo")?.id).toBe("c_pangyo");
    expect(resolveCafe(admin, SEED_CAFES, "nope")?.id).toBe("c_gangnam");
    expect(resolveCafe(admin, SEED_CAFES)?.id).toBe("c_gangnam");
  });
});
