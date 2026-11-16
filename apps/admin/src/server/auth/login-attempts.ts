import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

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

    /**
     * 실패를 기록하고, 이번에 잠갔으면 풀리는 시각을 돌려준다.
     * 읽고 나서 따로 쓰면 동시에 보낸 요청들이 같은 횟수를 읽어 잠금을 피해 가므로, 세기와 잠그기를 쿼리 하나로 한다.
     */
    async recordFailure(email: string, now: Date): Promise<Date | null> {
      const windowStart = new Date(now.getTime() - WINDOW);
      // 기간이 지나고 잠금도 풀린 기록은 지운다. 남겨 둬도 다음 실패를 1부터 세므로 동작은 같고, 아무 이메일이나
      // 넣어 보는 요청으로 줄이 계속 늘지 않게 한다.
      await db
        .delete(loginAttempts)
        .where(
          and(
            lt(loginAttempts.lastFailedAt, windowStart),
            or(isNull(loginAttempts.lockedUntil), lt(loginAttempts.lockedUntil, now)),
          ),
        );
      // ON CONFLICT의 SET 식에서 열 이름은 바꾸기 전 값을 가리킨다.
      const recent = sql`${loginAttempts.lastFailedAt} > ${windowStart.toISOString()}::timestamptz`;
      const failures = sql`case when ${recent} then ${loginAttempts.failures} + 1 else 1 end`;
      const lockEnd = new Date(now.getTime() + WINDOW).toISOString();
      const [row] = await db
        .insert(loginAttempts)
        .values({ email: key(email), failures: 1, lastFailedAt: now, lockedUntil: null })
        .onConflictDoUpdate({
          target: loginAttempts.email,
          set: {
            failures,
            lastFailedAt: now,
            lockedUntil: sql`case when ${failures} >= ${MAX_FAILURES} then ${lockEnd}::timestamptz else null end`,
          },
        })
        .returning({ lockedUntil: loginAttempts.lockedUntil });
      return row.lockedUntil;
    },

    async recordSuccess(email: string) {
      await db.delete(loginAttempts).where(eq(loginAttempts.email, key(email)));
    },
  };
}
