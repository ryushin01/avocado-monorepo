import "server-only";

import { logError } from "@avocado/logger";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";

import { getDb } from "@/db/server";
import type { AuditInput } from "@/entities/audit";
import type { ListRange } from "@/shared/lib/list";

import { createAuditRepository } from "./repository";

const repository = async () => createAuditRepository(await getDb());

export async function listAuditLogs(range: ListRange) {
  await connection();
  return (await repository()).list(range);
}

/**
 * 변경에 성공한 뒤 서버 액션에서 부른다. 변경은 이미 끝났으므로 기록에 실패해도 사용자에게 실패로
 * 알리지 않고 오류 로그를 남긴다. 변경과 한 트랜잭션이 아니어서 이때는 이력 한 건이 빠질 수 있다.
 */
export async function recordAudit(actor: { id: string; name: string }, input: AuditInput) {
  try {
    await (await repository()).record(actor, input, new Date());
    revalidatePath("/audit");
  } catch (error) {
    logError("admin", "audit_write_failed", {
      action: input.action,
      actorId: actor.id,
      error,
    });
  }
}
