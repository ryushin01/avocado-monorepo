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

const DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
const TIME = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** 한국 날짜 → "11월 21일 (토)". today(한국 날짜)를 주면 오늘·내일을 덧붙인다. */
export function formatBookingDate(date: string, today?: string) {
  const label = DATE.format(new Date(`${date}T12:00:00+09:00`));
  if (date === today) return `${label} · 오늘`;
  if (today && date === nextDay(today)) return `${label} · 내일`;
  return label;
}

/** 방문 시각(ISO) → "11월 21일 (토) 18:00" */
export const formatVisit = (iso: string) => `${DATE.format(new Date(iso))} ${TIME.format(new Date(iso))}`;
