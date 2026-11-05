import { sql } from "drizzle-orm";

import type { Database } from "@/db/index";
import { rateLimits } from "@/db/schema";

export type RateLimit = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * 고정 시간 구간 요청 제한. DB에 세므로 서버를 여러 대 띄우거나 다시 켜도 이어서 센다.
 * 확인과 증가를 쿼리 하나로 해서 동시에 들어온 요청도 빠짐없이 센다.
 */
export function createRateLimiter(db: Database) {
  return {
    async consume(key: string, { limit, windowMs }: RateLimit, now: Date): Promise<RateLimitResult> {
      const windowStart = new Date(now.getTime() - windowMs).toISOString();
      const started = sql`${rateLimits.windowStartedAt} > ${windowStart}::timestamptz`;
      const [row] = await db
        .insert(rateLimits)
        .values({ key, count: 1, windowStartedAt: now })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`case when ${started} then ${rateLimits.count} + 1 else 1 end`,
            windowStartedAt: sql`case when ${started} then ${rateLimits.windowStartedAt} else ${now.toISOString()}::timestamptz end`,
          },
        })
        .returning({ count: rateLimits.count, windowStartedAt: rateLimits.windowStartedAt });
      if (row.count <= limit) return { allowed: true };
      const resetAt = row.windowStartedAt.getTime() + windowMs;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
    },
  };
}
