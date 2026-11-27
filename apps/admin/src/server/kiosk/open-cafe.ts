import "server-only";

import { connection } from "next/server";

import { getDb } from "@/db/server";
import { createCafeRepository } from "@/server/cafes/repository";

/** 키오스크 API는 운영 중인 매장만 응답한다. 매장 전체가 아니라 그 매장 한 줄만 읽는다. */
export async function findOpenCafe(cafeId: string) {
  await connection();
  const cafe = await createCafeRepository(await getDb()).get(cafeId);
  return cafe?.status === "open" ? cafe : null;
}
