import { lt } from "drizzle-orm";

import type { Database } from "@/db/index";
import { auditLogs, loginAttempts, rateLimits, reservations, waitlistEntries } from "@/db/schema";
import { DAY } from "@/shared/lib/kst-time";

/**
 * 보관 기간. 지난 기록은 하루에 한 번 지운다(server/retention/route.ts, scripts/prune.ts).
 * - 손님 예약·대기(이름·휴대전화): 방문 예정일·대기 등록일로부터 90일. 온라인 예약 동의 문구의 보유 기간과 같다.
 *   이용 통계는 예약·대기가 아니라 이용 기록(손님 정보 없음)으로 내므로 지워도 통계는 그대로다.
 * - 변경 이력: 2년. 개인정보 처리시스템 접속기록 보관 기준(1년 이상, 대규모 처리자는 2년 이상)에 맞춰 넉넉히 둔다.
 * - 로그인 실패·요청 제한 횟수: 하루. 잠금(15분)·요청 제한(1분) 판단에는 그보다 오래된 줄이 필요 없다.
 */
export const RETENTION_DAYS = { guests: 90, audit: 730, counters: 1 } as const;

export type PruneResult = {
  reservations: number;
  waitlistEntries: number;
  auditLogs: number;
  loginAttempts: number;
  rateLimits: number;
};

export function createRetentionRepository(db: Database) {
  const before = (now: Date, days: number) => new Date(now.getTime() - days * DAY);
  return {
    /** 보관 기간이 지난 줄을 지우고 표마다 지운 수를 돌려준다. 여러 번 불러도 결과가 같다. */
    async prune(now: Date): Promise<PruneResult> {
      return db.transaction(async (tx) => {
        const count = (rows: unknown[]) => rows.length;
        return {
          reservations: count(
            await tx.delete(reservations).where(lt(reservations.startsAt, before(now, RETENTION_DAYS.guests))).returning({ id: reservations.id }),
          ),
          waitlistEntries: count(
            await tx
              .delete(waitlistEntries)
              .where(lt(waitlistEntries.createdAt, before(now, RETENTION_DAYS.guests)))
              .returning({ id: waitlistEntries.id }),
          ),
          auditLogs: count(
            await tx.delete(auditLogs).where(lt(auditLogs.at, before(now, RETENTION_DAYS.audit))).returning({ id: auditLogs.id }),
          ),
          loginAttempts: count(
            await tx
              .delete(loginAttempts)
              .where(lt(loginAttempts.lastFailedAt, before(now, RETENTION_DAYS.counters)))
              .returning({ email: loginAttempts.email }),
          ),
          rateLimits: count(
            await tx
              .delete(rateLimits)
              .where(lt(rateLimits.windowStartedAt, before(now, RETENTION_DAYS.counters)))
              .returning({ key: rateLimits.key }),
          ),
        };
      });
    },
  };
}
