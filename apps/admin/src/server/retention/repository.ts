import { subDays } from "date-fns/subDays";
import { inArray, lt } from "drizzle-orm";

import type { Database } from "@/db/index";
import { auditLogs, loginAttempts, rateLimits, reservations, waitlistEntries } from "@/db/schema";
import { inKst } from "@/shared/lib/kst-time";

/**
 * 보관 기간. 지난 기록은 하루에 한 번 지운다(server/retention/route.ts, scripts/prune.ts).
 * - 손님 예약·대기(이름·휴대전화): 방문 예정일·대기 등록일로부터 90일. 온라인 예약 동의 문구의 보유 기간과 같다.
 *   이용 통계는 예약·대기가 아니라 이용 기록(손님 정보 없음)으로 내므로 지워도 통계는 그대로다.
 * - 변경 이력: 2년(달력 기준). 개인정보 처리시스템 접속기록 보관 기준(1년 이상, 대규모 처리자는 2년 이상)에 맞춰 넉넉히 둔다.
 * - 로그인 실패·요청 제한 횟수: 하루. 잠금(15분)·요청 제한(1분) 판단에는 그보다 오래된 줄이 필요 없다.
 */
export const RETENTION_DAYS = { guests: 90, counters: 1 } as const;
export const AUDIT_RETENTION_YEARS = 2;

/** 한 번에 지우는 줄 수. 처음 돌리거나 한동안 멈췄다가 돌려도 문장 하나와 돌려받는 값이 커지지 않게 나눠 지운다. */
const BATCH_SIZE = 1000;

export type PruneResult = {
  reservations: number;
  waitlistEntries: number;
  auditLogs: number;
  loginAttempts: number;
  rateLimits: number;
};

const daysBefore = (now: Date, days: number) => new Date(subDays(now, days, { in: inKst }).getTime());
/** 달력으로 years년 전. 윤년이 끼면 365일×years보다 길다. */
function yearsBefore(now: Date, years: number) {
  const date = new Date(now);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

export function createRetentionRepository(db: Database, { batchSize = BATCH_SIZE } = {}) {
  /**
   * remove가 지운 줄이 batchSize보다 적을 때까지 되풀이하고 모두 센다. 문장마다 바로 확정되므로 중간에 실패해도
   * 지운 만큼은 남고, 다음 실행이 나머지를 지운다.
   */
  const inBatches = async (remove: () => Promise<unknown[]>) => {
    let total = 0;
    for (;;) {
      const removed = (await remove()).length;
      total += removed;
      if (removed < batchSize) return total;
    }
  };

  return {
    /** 보관 기간이 지난 줄을 지우고 표마다 지운 수를 돌려준다. 기준 시각은 처음에 한 번 정한다. 여러 번 불러도 결과가 같다. */
    async prune(now: Date): Promise<PruneResult> {
      const guests = daysBefore(now, RETENTION_DAYS.guests);
      const audit = yearsBefore(now, AUDIT_RETENTION_YEARS);
      const counters = daysBefore(now, RETENTION_DAYS.counters);
      return {
        reservations: await inBatches(() =>
          db
            .delete(reservations)
            .where(inArray(reservations.id, db.select({ id: reservations.id }).from(reservations).where(lt(reservations.startsAt, guests)).limit(batchSize)))
            .returning({ id: reservations.id }),
        ),
        waitlistEntries: await inBatches(() =>
          db
            .delete(waitlistEntries)
            .where(inArray(waitlistEntries.id, db.select({ id: waitlistEntries.id }).from(waitlistEntries).where(lt(waitlistEntries.createdAt, guests)).limit(batchSize)))
            .returning({ id: waitlistEntries.id }),
        ),
        auditLogs: await inBatches(() =>
          db
            .delete(auditLogs)
            .where(inArray(auditLogs.id, db.select({ id: auditLogs.id }).from(auditLogs).where(lt(auditLogs.at, audit)).limit(batchSize)))
            .returning({ id: auditLogs.id }),
        ),
        loginAttempts: await inBatches(() =>
          db
            .delete(loginAttempts)
            .where(inArray(loginAttempts.email, db.select({ email: loginAttempts.email }).from(loginAttempts).where(lt(loginAttempts.lastFailedAt, counters)).limit(batchSize)))
            .returning({ email: loginAttempts.email }),
        ),
        rateLimits: await inBatches(() =>
          db
            .delete(rateLimits)
            .where(inArray(rateLimits.key, db.select({ key: rateLimits.key }).from(rateLimits).where(lt(rateLimits.windowStartedAt, counters)).limit(batchSize)))
            .returning({ key: rateLimits.key }),
        ),
      };
    },
  };
}
