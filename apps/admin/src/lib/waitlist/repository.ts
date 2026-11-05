import { phoneLast4 } from "@/lib/guests/contact";
import type { MockDb } from "@/lib/mock-db";
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

const isActive = (e: WaitlistEntry) => ACTIVE_WAITLIST_STATUSES.includes(e.status);
const byNumber = (a: WaitlistEntry, b: WaitlistEntry) =>
  a.createdAt.localeCompare(b.createdAt) || a.number - b.number;

/** 키오스크에 보여줄 내 대기: 앞에 남은 팀 수와 함께 */
export type WaitlistPosition = WaitlistEntry & { ahead: number };

/** 백엔드가 정해지면 이 인터페이스의 API 구현체로 교체한다. */
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

export function createWaitlistRepository(db: MockDb): WaitlistRepository {
  const active = (cafeId: string) =>
    db.waitlist.filter((e) => e.cafeId === cafeId && isActive(e)).sort(byNumber);
  const withAhead = (entry: WaitlistEntry): WaitlistPosition => ({
    ...entry,
    ahead: active(entry.cafeId).findIndex((e) => e.id === entry.id),
  });

  return {
    async listToday(cafeId, now) {
      const from = new Date(startOfKstDay(now.getTime())).toISOString();
      return db.waitlist
        .filter((e) => e.cafeId === cafeId && (e.createdAt >= from || isActive(e)))
        .sort(byNumber)
        .map((e) => ({ ...e }));
    },

    async add(cafeId, input, now) {
      if (!db.cafes.some((c) => c.id === cafeId && c.status === "open")) return "closed-cafe";
      if (active(cafeId).some((e) => e.phone === input.phone)) return "duplicate";
      const from = new Date(startOfKstDay(now.getTime())).toISOString();
      const todayCount = db.waitlist.filter((e) => e.cafeId === cafeId && e.createdAt >= from).length;
      const entry: WaitlistEntry = {
        ...input,
        id: `w_${db.nextWaitlistId++}`,
        cafeId,
        number: todayCount + 1,
        createdAt: now.toISOString(),
        status: "waiting",
      };
      db.waitlist.push(entry);
      return withAhead(entry);
    },

    async setStatus(cafeId, id, status, now) {
      const index = db.waitlist.findIndex((e) => e.id === id && e.cafeId === cafeId);
      if (index === -1) return "not-found";
      const current = db.waitlist[index];
      if (!isActive(current)) return "finished";
      if (!canChangeWaitlist(current.status, status)) return "invalid-transition";
      db.waitlist[index] = {
        ...current,
        status,
        calledAt: status === "called" ? now.toISOString() : current.calledAt,
        closedAt: isActive({ ...current, status }) ? undefined : now.toISOString(),
      };
      return { ...db.waitlist[index] };
    },

    async countActive(cafeId) {
      return active(cafeId).length;
    },

    async findForKiosk(cafeId, last4) {
      return active(cafeId)
        .filter((e) => phoneLast4(e.phone) === last4)
        .map(withAhead);
    },
  };
}
