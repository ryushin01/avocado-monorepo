import { firstParam } from "@/lib/games/schema";

import { DEFAULT_STAT_PERIOD, STAT_PERIODS, type StatPeriod } from "./types";

/** URL의 period 파라미터. 알 수 없는 값이면 기본 기간 */
export function parseStatPeriod(params: Record<string, string | string[] | undefined>): StatPeriod {
  const value = Number(firstParam(params.period));
  return (STAT_PERIODS as readonly number[]).includes(value)
    ? (value as StatPeriod)
    : DEFAULT_STAT_PERIOD;
}

/** 지난 기간 대비 증감률(%). 지난 기간이 0이면 비교할 수 없어 null */
export function changeRate(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
