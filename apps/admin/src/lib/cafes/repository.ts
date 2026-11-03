import type { MockDb } from "@/lib/mock-db";

import type { CafeInput } from "./schema";
import type { Cafe, CafeOverview, CafeStatus } from "./types";

export type CafeSaveError = "not-found" | "duplicate-name";
export type CafeStatusError = "not-found" | "in-use";

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. */
export interface CafeRepository {
  /** 모든 매장 (폐점 포함), 등록 순 */
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

export function createCafeRepository(db: MockDb): CafeRepository {
  const nameTaken = (name: string, exceptId?: string) =>
    db.cafes.some((c) => c.id !== exceptId && sameName(c.name, name));

  return {
    async list() {
      return db.cafes.map((c) => ({ ...c }));
    },
    async get(id) {
      const cafe = db.cafes.find((c) => c.id === id);
      return cafe ? { ...cafe } : null;
    },
    async overview() {
      const count = <T,>(items: T[], cafeId: (item: T) => string | undefined) => {
        const map = new Map<string, number>();
        for (const item of items) {
          const id = cafeId(item);
          if (id) map.set(id, (map.get(id) ?? 0) + 1);
        }
        return map;
      };
      const games = count(db.inventory, (i) => i.cafeId);
      const staff = count(
        db.users.filter((u) => u.active && u.role === "staff"),
        (u) => u.cafeId,
      );
      const inUse = count(
        db.plays.filter((p) => !p.returnedAt),
        (p) => p.cafeId,
      );
      return db.cafes
        .map((c) => ({
          ...c,
          gameCount: games.get(c.id) ?? 0,
          staffCount: staff.get(c.id) ?? 0,
          inUseCount: inUse.get(c.id) ?? 0,
        }))
        .sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed"));
    },
    async create(input) {
      if (nameTaken(input.name)) return "duplicate-name";
      const cafe: Cafe = { ...input, id: `c_${db.nextCafeId++}`, status: "open" };
      db.cafes.push(cafe);
      return { ...cafe };
    },
    async update(id, input) {
      const index = db.cafes.findIndex((c) => c.id === id);
      if (index === -1) return "not-found";
      if (nameTaken(input.name, id)) return "duplicate-name";
      // 폼에서 비운 선택 항목(주소·전화번호)은 지운다.
      db.cafes[index] = {
        ...db.cafes[index],
        address: undefined,
        phone: undefined,
        ...input,
      };
      return { ...db.cafes[index] };
    },
    async setStatus(id, status) {
      const index = db.cafes.findIndex((c) => c.id === id);
      if (index === -1) return "not-found";
      if (status === "closed" && db.plays.some((p) => p.cafeId === id && !p.returnedAt)) {
        return "in-use";
      }
      db.cafes[index] = {
        ...db.cafes[index],
        status,
        closedAt: status === "closed" ? new Date().toISOString() : undefined,
      };
      return { ...db.cafes[index] };
    },
  };
}
