import { count, desc, eq } from "drizzle-orm";

import { newId } from "@/db/ids";
import type { Database } from "@/db/index";
import { toAuditEntry } from "@/db/mappers";
import { auditLogs, cafes } from "@/db/schema";
import type { AuditEntry, AuditInput } from "@/entities/audit";
import type { ListRange, ListResult } from "@/shared/lib/list";

/** 기록은 추가만 한다. 고치거나 지우는 방법을 일부러 두지 않는다. */
export interface AuditRepository {
  record(actor: { id: string; name: string }, input: AuditInput, now: Date): Promise<void>;
  /** 최근 작업부터 */
  list(range: ListRange): Promise<ListResult<AuditEntry>>;
}

export function createAuditRepository(db: Database): AuditRepository {
  return {
    async record(actor, input, now) {
      await db.insert(auditLogs).values({
        id: newId("aud"),
        at: now,
        actorId: actor.id,
        actorName: actor.name,
        action: input.action,
        targetName: input.targetName,
        cafeId: input.cafeId,
        detail: input.detail,
      });
    },

    async list({ offset, limit }) {
      const [rows, [{ total }]] = await Promise.all([
        db
          .select({ log: auditLogs, cafeName: cafes.name })
          .from(auditLogs)
          .leftJoin(cafes, eq(auditLogs.cafeId, cafes.id))
          .orderBy(desc(auditLogs.at), desc(auditLogs.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(auditLogs),
      ]);
      return { items: rows.map((r) => toAuditEntry(r.log, r.cafeName)), total };
    },
  };
}
