import "server-only";

import { handleDemoDbRequest } from "@/db/demo-proxy";
import { dbTarget, getDemoOwnerDb, pgliteOf } from "@/db/server";

/**
 * 공개 데모의 DB 중계 경로(/api/demo/db). DATABASE_URL이 없는 데모만 쓴다.
 * 데모가 아니거나 공유 PostgreSQL을 쓰는 데모면 없는 경로처럼 404를 돌려준다.
 */
export async function POST(request: Request): Promise<Response> {
  if (dbTarget() !== "demo-proxy") return new Response(null, { status: 404 });
  return handleDemoDbRequest(request, async () => {
    const client = pgliteOf(await getDemoOwnerDb());
    if (!client) throw new Error("공개 데모 DB는 PGlite여야 합니다.");
    return client;
  });
}
