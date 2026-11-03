import "server-only";

import { connection } from "next/server";

import type { ListRange } from "@/lib/list";
import { getMockDb } from "@/lib/mock-db/server";

import { createPlayRepository } from "./repository";
import type { PlayStartInput } from "./schema";
import {
  POPULARITY_PERIOD_DAYS,
  type PlayHistoryFilter,
  type PopularityPeriod,
  type PopularityRanking,
} from "./types";

const DAY = 86_400_000;
const repository = () => createPlayRepository(getMockDb());

/** 최근 7일(주간)·30일(월간) 인기 게임 순위. 지금 시각을 기준으로 계산한다. */
export async function getPopularityRanking(
  cafeIds: string[],
  period: PopularityPeriod,
): Promise<PopularityRanking> {
  await connection();
  const to = new Date();
  const from = new Date(to.getTime() - POPULARITY_PERIOD_DAYS[period] * DAY);
  const items = await repository().ranking(cafeIds, { from, to });
  return { period, from: from.toISOString(), to: to.toISOString(), items };
}

/** 대시보드: 지금 이용 중·오늘·최근 7일 이용 횟수 */
export async function summarizePlayUsage(cafeIds: string[]) {
  await connection();
  return repository().usage(cafeIds, new Date());
}

/** 지금 이용 중인 기록과 조회 시각(경과 시간 계산용) */
export async function listActivePlays(cafeId: string) {
  await connection();
  const plays = await repository().listActive(cafeId);
  return { plays, now: Date.now() };
}

export async function listPlayHistory(
  cafeId: string,
  filter?: PlayHistoryFilter,
  range?: ListRange,
) {
  await connection();
  return repository().listHistory(cafeId, filter, range);
}

export function listRentableGames(cafeId: string) {
  return repository().listRentable(cafeId);
}

export function startPlay(cafeId: string, input: PlayStartInput) {
  return repository().start(cafeId, input);
}

export function returnPlay(cafeId: string, id: string) {
  return repository().return(cafeId, id);
}

export function cancelPlay(cafeId: string, id: string) {
  return repository().cancel(cafeId, id);
}
