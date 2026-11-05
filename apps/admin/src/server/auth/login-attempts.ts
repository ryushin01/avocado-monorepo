import { eq } from "drizzle-orm";

import type { Database } from "@/db/index";
import { loginAttempts } from "@/db/schema";

/** 연속으로 이만큼 틀리면 잠근다. */
export const MAX_FAILURES = 5;
/** 잠그는 시간, 그리고 실패 횟수를 이어서 세는 시간 */
export const LOCK_MINUTES = 15;
const WINDOW = LOCK_MINUTES * 60_000;

/**
 * 로그인 연속 실패 잠금 (이메일별).
 * - 15분 안에 5번 틀리면 그때부터 15분 동안 잠근다. 잠긴 동안에는 맞는 비밀번호도 받지 않는다.
 * - 성공하면 기록을 지운다. 마지막 실패가 15분 넘게 지났으면 처음부터 다시 센다.
 * 이메일 기준이라 남이 일부러 틀려 잠글 수도 있지만, 사내 백오피스라 비밀번호 추측을 막는 쪽을 택했다.
 */
export function createLoginAttemptRepository(db: Database) {
  const key = (email: string) => email.trim().toLowerCase();
  return {
    /** 잠겨 있으면 풀리는 시각 */
    async lockedUntil(email: string, now: Date): Promise<Date | null> {
      const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.email, key(email)));
      return row?.lockedUntil && row.lockedUntil > now ? row.lockedUntil : null;
    },

    /** 실패를 기록하고, 이번에 잠갔으면 풀리는 시각을 돌려준다. */
    async recordFailure(email: string, now: Date): Promise<Date | null> {
      const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.email, key(email)));
      const recent = row && now.getTime() - row.lastFailedAt.getTime() < WINDOW;
      const failures = recent ? row.failures + 1 : 1;
      const lockedUntil = failures >= MAX_FAILURES ? new Date(now.getTime() + WINDOW) : null;
      await db
        .insert(loginAttempts)
        .values({ email: key(email), failures, lastFailedAt: now, lockedUntil })
        .onConflictDoUpdate({
          target: loginAttempts.email,
          set: { failures, lastFailedAt: now, lockedUntil },
        });
      return lockedUntil;
    },

    async recordSuccess(email: string) {
      await db.delete(loginAttempts).where(eq(loginAttempts.email, key(email)));
    },
  };
}
