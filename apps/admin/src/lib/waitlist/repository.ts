import { and, asc, count, eq, gte, inArray, or } from "drizzle-orm";

import type { Database } from "@/db";
import { newId } from "@/db/ids";
import { toWaitlistEntry } from "@/db/mappers";
import { cafes, waitlistEntries } from "@/db/schema";
import { phoneLast4 } from "@/lib/guests/contact";
import { startOfKstDay } from "@/lib/plays/time";

import type { WaitlistInput } from "./schema";
import { ACTIVE_WAITLIST_STATUSES, type WaitlistEntry, type WaitlistStatus } from "./types";

/**
 * - not-found: 그 매장에 없는 대기
 * - closed-cafe: 폐점 매장
 * - duplicate: 같은 전화번호가 이미 줄에 있음
 * - finished: 이미 입장·이탈로 끝남
 * - invalid-transition: 그 상태로 바꿀 수 없음 (예: 호출함 → 대기 중)
 */
export type WaitlistError = "not-found" | "closed-cafe" | "duplicate" | "finished" | "invalid-transition";

const TRANSITIONS: Record<WaitlistStatus, readonly WaitlistStatus[]> = {
  waiting: ["called", "seated", "left"],
  called: ["seated", "left"],
  seated: [],
  left: [],
};

export const canChangeWaitlist = (from: WaitlistStatus, to: WaitlistStatus) =>
  TRANSITIONS[from].includes(to);

/** 키오스크에 보여줄 내 대기: 앞에 남은 팀 수와 함께 */
export type WaitlistPosition = WaitlistEntry & { ahead: number };

/** 백엔드를 바꾸면 이 인터페이스의 구현만 교체한다. */
export interface WaitlistRepository {
  /** 오늘(한국 날짜) 그 매장의 대기 전부, 등록순 */
  listToday(cafeId: string, now: Date): Promise<WaitlistEntry[]>;
  add(cafeId: string, input: WaitlistInput, now: Date): Promise<WaitlistPosition | WaitlistError>;
  setStatus(
    cafeId: string,
    id: string,
    status: WaitlistStatus,
    now: Date,
  ): Promise<WaitlistEntry | WaitlistError>;
  /** 키오스크: 줄에 있는 팀 수 */
  countActive(cafeId: string): Promise<number>;
  /** 키오스크: 전화번호 뒷자리로 내 순서 찾기 */
  findForKiosk(cafeId: string, last4: string): Promise<WaitlistPosition[]>;
}

export function createWaitlistRepository(db: Database): WaitlistRepository {
  const isActive = (status: WaitlistStatus) => ACTIVE_WAITLIST_STATUSES.includes(status);
  const activeIn = (cafeId: string) =>
    and(eq(waitlistEntries.cafeId, cafeId), inArray(waitlistEntries.status, [...ACTIVE_WAITLIST_STATUSES]));
  /** 줄에 있는 팀, 먼저 온 순 */
  const activeList = async (cafeId: string) =>
    (
      await db
        .select()
        .from(waitlistEntries)
        .where(activeIn(cafeId))
        .orderBy(asc(waitlistEntries.createdAt), asc(waitlistEntries.number))
    ).map(toWaitlistEntry);
  const withAhead = (entry: WaitlistEntry, line: WaitlistEntry[]): WaitlistPosition => ({
    ...entry,
    ahead: line.findIndex((e) => e.id === entry.id),
  });

  return {
    async listToday(cafeId, now) {
      const from = new Date(startOfKstDay(now.getTime()));
      const rows = await db
        .select()
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.cafeId, cafeId),
            or(gte(waitlistEntries.createdAt, from), inArray(waitlistEntries.status, [...ACTIVE_WAITLIST_STATUSES])),
          ),
        )
        .orderBy(asc(waitlistEntries.createdAt), asc(waitlistEntries.number));
      return rows.map(toWaitlistEntry);
    },

    async add(cafeId, input, now) {
      const result = await db.transaction(async (tx) => {
        // 같은 매장의 동시 등록이 같은 번호를 받지 않도록 매장 줄을 잠근다.
        const [cafe] = await tx
          .select()
          .from(cafes)
          .where(and(eq(cafes.id, cafeId), eq(cafes.status, "open")))
          .for("update");
        if (!cafe) return "closed-cafe" as const;
        const [dup] = await tx
          .select({ id: waitlistEntries.id })
          .from(waitlistEntries)
          .where(and(activeIn(cafeId), eq(waitlistEntries.phone, input.phone)));
        if (dup) return "duplicate" as const;
        const [{ n }] = await tx
          .select({ n: count() })
          .from(waitlistEntries)
          .where(
            and(eq(waitlistEntries.cafeId, cafeId), gte(waitlistEntries.createdAt, new Date(startOfKstDay(now.getTime())))),
          );
        const [row] = await tx
          .insert(waitlistEntries)
          .values({ ...input, id: newId("w"), cafeId, number: n + 1, createdAt: now, status: "waiting" })
          .returning();
        return toWaitlistEntry(row);
      });
      if (typeof result === "string") return result;
      return withAhead(result, await activeList(cafeId));
    },

    async setStatus(cafeId, id, status, now) {
      const where = and(eq(waitlistEntries.id, id), eq(waitlistEntries.cafeId, cafeId));
      const [current] = await db.select().from(waitlistEntries).where(where);
      if (!current) return "not-found";
      if (!isActive(current.status)) return "finished";
      if (!canChangeWaitlist(current.status, status)) return "invalid-transition";
      const [row] = await db
        .update(waitlistEntries)
        .set({
          status,
          calledAt: status === "called" ? now : current.calledAt,
          closedAt: isActive(status) ? null : now,
        })
        .where(where)
        .returning();
      return toWaitlistEntry(row);
    },

    async countActive(cafeId) {
      const [{ n }] = await db.select({ n: count() }).from(waitlistEntries).where(activeIn(cafeId));
      return n;
    },

    async findForKiosk(cafeId, last4) {
      const line = await activeList(cafeId);
      return line.filter((e) => phoneLast4(e.phone) === last4).map((e) => withAhead(e, line));
    },
  };
}
