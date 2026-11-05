// 화면 표시용. 매장이 모두 한국에 있으므로 한국 시간으로 보여준다.
const time = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Seoul",
});
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Seoul",
});

/** 14:05 */
export const formatTime = (iso: string) => time.format(new Date(iso));

/** 11월 3일 (월) 14:05 */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** 45분, 1시간 30분 */
export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** 통계 화면 숫자 표기 */
const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export const formatNumber = (n: number) => number.format(n);

/** "11월 3일" */
export const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

/** "11. 3." 축 눈금용 */
export const formatTickDate = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
};

/** 11월 3일 (재고 변경일) */
export const formatUpdatedAt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
