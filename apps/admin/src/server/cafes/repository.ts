import { and, count, eq, isNull, ne } from "drizzle-orm";

import type { Database } from "@/db/index";
import { newId } from "@/db/ids";
import { toCafe } from "@/db/mappers";
import { cafes, inventoryItems, playSessions, users } from "@/db/schema";

import type { CafeInput, Cafe, CafeOverview, CafeStatus } from "@/entities/cafe";

export type CafeSaveError = "not-found" | "duplicate-name";
export type CafeStatusError = "not-found" | "in-use";

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface CafeRepository {
  /** 모든 매장 (폐점 포함), 개점일·이름순 */
  list(): Promise<Cafe[]>;
  get(id: string): Promise<Cafe | null>;
  /** 매장 관리 화면용: 운영 중인 매장 먼저, 보유 게임·직원·이용 중 수와 함께 */
  overview(): Promise<CafeOverview[]>;
  create(input: CafeInput): Promise<Cafe | "duplicate-name">;
  update(id: string, input: CafeInput): Promise<Cafe | CafeSaveError>;
  /** 이용 중인 게임이 있으면 폐점할 수 없다. */
  setStatus(id: string, status: CafeStatus): Promise<Cafe | CafeStatusError>;
}

const sameName = (a: string, b: string) => a.replace(/\s/g, "") === b.replace(/\s/g, "");
const byOpening = (a: Cafe, b: Cafe) => a.openedAt.localeCompare(b.openedAt) || a.name.localeCompare(b.name, "ko");

export function createCafeRepository(db: Database): CafeRepository {
  async function nameTaken(name: string, exceptId?: string) {
    const rows = await db
      .select({ name: cafes.name })
      .from(cafes)
      .where(exceptId ? ne(cafes.id, exceptId) : undefined);
    return rows.some((r) => sameName(r.name, name));
  }
  const countBy = async (query: Promise<{ cafeId: string | null; n: number }[]>) =>
    new Map((await query).flatMap((r) => (r.cafeId ? [[r.cafeId, r.n] as const] : [])));

  return {
    async list() {
      return (await db.select().from(cafes)).map(toCafe).sort(byOpening);
    },

    async get(id) {
      const [row] = await db.select().from(cafes).where(eq(cafes.id, id));
      return row ? toCafe(row) : null;
    },

    async overview() {
      const [list, gameCounts, staffCounts, inUseCounts] = await Promise.all([
        this.list(),
        countBy(
          db
            .select({ cafeId: inventoryItems.cafeId, n: count() })
            .from(inventoryItems)
            .groupBy(inventoryItems.cafeId),
        ),
        countBy(
          db
            .select({ cafeId: users.cafeId, n: count() })
            .from(users)
            .where(and(eq(users.active, true), eq(users.role, "staff")))
            .groupBy(users.cafeId),
        ),
        countBy(
          db
            .select({ cafeId: playSessions.cafeId, n: count() })
            .from(playSessions)
            .where(isNull(playSessions.returnedAt))
            .groupBy(playSessions.cafeId),
        ),
      ]);
      return list
        .map((c) => ({
          ...c,
          gameCount: gameCounts.get(c.id) ?? 0,
          staffCount: staffCounts.get(c.id) ?? 0,
          inUseCount: inUseCounts.get(c.id) ?? 0,
        }))
        .sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed"));
    },

    async create(input) {
      if (await nameTaken(input.name)) return "duplicate-name";
      const [row] = await db
        .insert(cafes)
        .values({
          ...input,
          id: newId("c"),
          address: input.address ?? null,
          phone: input.phone ?? null,
          status: "open",
        })
        .returning();
      return toCafe(row);
    },

    async update(id, input) {
      if (!(await this.get(id))) return "not-found";
      if (await nameTaken(input.name, id)) return "duplicate-name";
      // 폼에서 비운 선택 항목(주소·전화번호)은 지운다.
      const [row] = await db
        .update(cafes)
        .set({ ...input, address: input.address ?? null, phone: input.phone ?? null })
        .where(eq(cafes.id, id))
        .returning();
      return toCafe(row);
    },

    async setStatus(id, status) {
      if (!(await this.get(id))) return "not-found";
      if (status === "closed") {
        const [{ n }] = await db
          .select({ n: count() })
          .from(playSessions)
          .where(and(eq(playSessions.cafeId, id), isNull(playSessions.returnedAt)));
        if (n > 0) return "in-use";
      }
      const [row] = await db
        .update(cafes)
        .set({ status, closedAt: status === "closed" ? new Date() : null })
        .where(eq(cafes.id, id))
        .returning();
      return toCafe(row);
    },
  };
}
