import "server-only";

import { getDb } from "@/db/server";

import { createRetentionRepository } from "./repository";

/** 보관 기간이 지난 손님 예약·대기, 변경 이력, 로그인 실패·요청 제한 기록을 지운다. */
export async function pruneExpiredRecords() {
  return createRetentionRepository(await getDb()).prune(new Date());
}
