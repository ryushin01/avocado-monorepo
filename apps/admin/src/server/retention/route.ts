import { timingSafeEqual } from "node:crypto";

import { logError, logInfo } from "@avocado/logger";

import { pruneExpiredRecords } from "./data";

const matches = (given: string, expected: string) =>
  given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/**
 * 하루 한 번 보관 기간이 지난 기록을 지운다(Vercel Cron: apps/admin/vercel.json).
 * Vercel이 보내는 Authorization: Bearer <CRON_SECRET>을 확인하고, CRON_SECRET이 없으면 실행하지 않는다.
 * 다른 호스팅에서는 같은 일을 하는 pnpm --filter @avocado/admin db:prune을 예약 작업으로 돌린다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || !matches(given, `Bearer ${secret}`)) {
    return Response.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  try {
    const removed = await pruneExpiredRecords();
    // 지운 수만 남긴다(내용은 남기지 않음). 호스팅의 로그에서 매일 정리됐는지 확인할 수 있다.
    logInfo("admin", "retention_pruned", removed);
    return Response.json({ removed });
  } catch (error) {
    logError("admin", "retention_failed", { error });
    return Response.json({ error: "정리하지 못했습니다." }, { status: 500 });
  }
}
