import "server-only";

import { listCafes } from "@/server/cafes/data";

/** 키오스크 API는 운영 중인 매장만 응답한다. */
export async function findOpenCafe(cafeId: string) {
  return (await listCafes()).find((c) => c.id === cafeId && c.status === "open") ?? null;
}
