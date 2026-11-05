import "server-only";

import { connection } from "next/server";

import { getDb } from "@/db/server";

import { createStatsRepository } from "./repository";
import type { StatPeriod } from "./types";

/** 통계. 지금 시각을 기준으로 계산하므로 요청 시점에 읽는다. */
export async function getStats(cafeIds: string[], period: StatPeriod) {
  await connection();
  return createStatsRepository(await getDb()).summarize(cafeIds, period, new Date());
}
