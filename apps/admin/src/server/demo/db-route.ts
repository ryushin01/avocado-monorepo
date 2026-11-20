import "server-only";

import { handleDemoDbRequest } from "@/db/demo-proxy";
import { getDemoOwnerDb, pgliteOf } from "@/db/server";
import { isDemoMode } from "@/shared/config";

/** 공개 데모의 DB 중계 경로(/api/demo/db). 데모가 아니면 없는 경로처럼 404를 돌려준다. */
export async function POST(request: Request): Promise<Response> {
  if (!isDemoMode()) return new Response(null, { status: 404 });
  return handleDemoDbRequest(request, async () => {
    const client = pgliteOf(await getDemoOwnerDb());
    if (!client) throw new Error("공개 데모 DB는 PGlite여야 합니다.");
    return client;
  });
}
