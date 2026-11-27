// 서버 컴포넌트(booking-steps·booking-search)에서만 가져온다. 클라이언트 컴포넌트가 가져오면 date-fns(한국어 로캘·시간대)가
// 손님 브라우저 번들에 들어가므로, 클라이언트에서 쓰는 방문 시각 표시는 format-visit.ts에 따로 둔다.
// (server-only를 붙이면 같은 컴포넌트를 그리는 Storybook에서 가져올 수 없어 주석으로 남긴다.)
import { tz } from "@date-fns/tz";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { ko } from "date-fns/locale/ko";
import { parse } from "date-fns/parse";

import type { BookingOptions } from "@avocado/domain/booking";

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * 예약 화면 주소(?cafe=&date=&people=)를 선택지에 맞춰 읽는다. 선택지에 없는 값은 버린다.
 * submitted: '빈 시간 보기'를 누른 뒤인지. 매장을 고르지 않고 누르면 매장 칸에 오류를 보인다.
 */
export function parseBookingQuery(params: Params, options: BookingOptions) {
  const cafe = options.cafes.find((c) => c.id === first(params.cafe));
  const rawDate = first(params.date);
  const date = rawDate && options.dates.includes(rawDate) ? rawDate : undefined;
  const people = Number(first(params.people));
  const partySize = Number.isInteger(people) && people >= 1 && people <= options.maxPartySize ? people : undefined;
  const submitted = ["cafe", "date", "people"].some((key) => first(params[key]) !== undefined);
  return { cafe, date, partySize, submitted };
}

export type BookingQuery = ReturnType<typeof parseBookingQuery>;

const kst = { in: tz("Asia/Seoul"), locale: ko };
/** 한국 날짜 YYYY-MM-DD → 한국 시간 그날 0시 */
const kstDay = (date: string) => parse(date, "yyyy-MM-dd", 0, kst);

/** 지금의 한국 날짜 YYYY-MM-DD */
export const kstToday = (now: number = Date.now()) => format(now, "yyyy-MM-dd", kst);

const nextDay = (date: string) => format(addDays(kstDay(date), 1, kst), "yyyy-MM-dd", kst);

/** 한국 날짜 → "11월 21일 (토)". today(한국 날짜)를 주면 오늘·내일을 덧붙인다. */
export function formatBookingDate(date: string, today?: string) {
  const label = format(kstDay(date), "M월 d일 (EEE)", kst);
  if (date === today) return `${label} · 오늘`;
  if (today && date === nextDay(today)) return `${label} · 내일`;
  return label;
}
