import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/index";
import { newId } from "@/db/ids";
import { toCafeTable } from "@/db/mappers";
import { cafeTables, cafes } from "@/db/schema";
import type { CafeTable, CafeTableInput } from "@/entities/cafe";

/**
 * - not-found: 그 매장에 없는 매장·테이블
 * - duplicate-label: 같은 매장에 같은 이름의 테이블이 있음(공백 무시)
 */
export type CafeTableError = "not-found" | "duplicate-label";

const sameLabel = (a: string, b: string) => a.replace(/\s/g, "").toLowerCase() === b.replace(/\s/g, "").toLowerCase();
const byLabel = (a: CafeTable, b: CafeTable) => a.label.localeCompare(b.label, "ko", { numeric: true });

/** 매장 테이블. 예약 배정 규칙은 entities/reservation의 seating에 있다. */
export function createCafeTableRepository(db: Database) {
  const list = async (cafeId: string) =>
    (await db.select().from(cafeTables).where(eq(cafeTables.cafeId, cafeId)).orderBy(asc(cafeTables.label)))
      .map(toCafeTable)
      .sort(byLabel);

  return {
    /** 매장의 모든 테이블(쓰지 않는 것 포함), 이름순 */
    list,

    /**
     * 같은 매장에 이름이 같은(공백·대소문자 무시) 테이블이 있으면 더하지 않는다. 매장 줄을 잠근 뒤 확인하고 넣어,
     * 두 직원이 "A1"과 "a 1"을 동시에 더해도 하나만 남는다(고유 인덱스는 원래 이름만 막음).
     */
    async add(cafeId: string, input: CafeTableInput, now: Date): Promise<CafeTable | CafeTableError> {
      return db.transaction(async (tx) => {
        const [cafe] = await tx.select({ id: cafes.id }).from(cafes).where(eq(cafes.id, cafeId)).for("update");
        if (!cafe) return "not-found" as const;
        const labels = await tx.select({ label: cafeTables.label }).from(cafeTables).where(eq(cafeTables.cafeId, cafeId));
        if (labels.some((t) => sameLabel(t.label, input.label))) return "duplicate-label" as const;
        const [row] = await tx
          .insert(cafeTables)
          .values({ id: newId("t"), cafeId, label: input.label, seats: input.seats, active: true, createdAt: now })
          .onConflictDoNothing()
          .returning();
        return row ? toCafeTable(row) : ("duplicate-label" as const);
      });
    },

    /** 쓰지 않게 된 테이블은 지우지 않고 끈다. 이미 배정한 예약은 그대로 두고, 새 배정에서만 빠진다. */
    async setActive(cafeId: string, id: string, active: boolean): Promise<CafeTable | CafeTableError> {
      const [row] = await db
        .update(cafeTables)
        .set({ active })
        .where(and(eq(cafeTables.id, id), eq(cafeTables.cafeId, cafeId)))
        .returning();
      return row ? toCafeTable(row) : "not-found";
    },
  };
}
