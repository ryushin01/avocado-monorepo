import { format } from "date-fns/format";
import { formatDuration } from "date-fns/formatDuration";
import { parse } from "date-fns/parse";
import { ko } from "date-fns/locale/ko";

import { inKst } from "./kst-time";

// 화면 표시용. 매장이 모두 한국에 있으므로 한국 시간으로 보여준다.
const kst = { in: inKst, locale: ko };

/** 14:05 */
export const formatTime = (iso: string) => format(iso, "HH:mm", kst);

/** 11월 3일 (월) 14:05 */
export const formatDateTime = (iso: string) => format(iso, "M월 d일 (EEE) HH:mm", kst);

/** 45분, 1시간 30분 */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  // 0인 단위는 빼고 쓴다. 1시간이 안 되면 0분도 "0분"으로 보인다.
  if (hours === 0) return formatDuration({ minutes }, { locale: ko, zero: true });
  return formatDuration({ hours, minutes: minutes % 60 }, { locale: ko });
}

/** 통계 화면 숫자 표기 */
const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export const formatNumber = (n: number) => number.format(n);

/** 한국 날짜 YYYY-MM-DD를 한국 시간 그날 0시로 읽는다(시간대에 따라 날짜가 밀리지 않음). */
const kstDay = (date: string) => parse(date, "yyyy-MM-dd", 0, kst);

/** 한국 날짜 YYYY-MM-DD → "11월 3일" */
export const formatShortDate = (date: string) => format(kstDay(date), "M월 d일", kst);

/** "11/3" 축 눈금용 */
export const formatTickDate = (date: string) => format(kstDay(date), "M/d", kst);

/** 시각(ISO) → 한국 날짜 "11월 3일" */
export const formatMonthDay = (iso: string) => format(iso, "M월 d일", kst);

/** 11월 3일 (재고 변경일) */
export const formatUpdatedAt = formatMonthDay;
