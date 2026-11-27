import { tz } from "@date-fns/tz";
import { addDays } from "date-fns/addDays";
import { differenceInMinutes } from "date-fns/differenceInMinutes";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfDay } from "date-fns/startOfDay";

// 매장은 모두 한국에 있으므로 날짜 경계는 한국 시간으로 정한다. 계산은 date-fns에 시간대(Asia/Seoul)를 넘겨 한다.
export const KST_ZONE = "Asia/Seoul";
/** date-fns의 `in` 옵션: 계산·형식을 한국 시간으로 한다(실행 환경의 시간대와 무관). */
export const inKst = tz(KST_ZONE);
/** 날짜 계산이 아닌 기간(ms) 비교용 하루 길이 */
export const DAY = 86_400_000;

/** 그 시각이 속한 한국 날짜의 0시 (UTC 밀리초) */
export function startOfKstDay(time: number) {
  return startOfDay(time, { in: inKst }).getTime();
}

/** 한국 날짜 YYYY-MM-DD → 그날 0시 (UTC 밀리초) */
const kstMidnight = (date: string) => parse(date, "yyyy-MM-dd", 0, { in: inKst }).getTime();

/** YYYY-MM-DD(한국 날짜) → [그날 0시, 다음날 0시) */
export function kstDayRange(date: string) {
  const from = kstMidnight(date);
  return { from, to: addDays(from, 1, { in: inKst }).getTime() };
}

/** 한국 날짜에서 days일 뒤(앞)의 한국 날짜 */
export const addKstDays = (date: string, days: number) => toKstDate(addDays(kstMidnight(date), days, { in: inKst }).getTime());

/** 시각 → 한국 날짜 YYYY-MM-DD */
export function toKstDate(time: number) {
  return format(time, "yyyy-MM-dd", { in: inKst });
}

/** 한국 날짜(YYYY-MM-DD)와 시각(HH:mm) → UTC ISO 시각("…Z") */
export const kstIso = (date: string, time: string) =>
  new Date(parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", 0, { in: inKst }).getTime()).toISOString();

/** 시각(ISO 또는 밀리초) → 한국 시각 HH:mm */
export const toKstTime = (time: string | number) => format(time, "HH:mm", { in: inKst });

/** 두 시각 사이의 분 (내림, 음수는 0) */
export const minutesBetween = (from: string, to: string | number) =>
  Math.max(0, differenceInMinutes(to, from));
