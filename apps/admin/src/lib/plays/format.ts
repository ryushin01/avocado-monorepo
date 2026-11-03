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

/** 인원 · 테이블 */
export function formatPlayMeta({ playerCount, table }: { playerCount: number; table?: string }) {
  return table ? `${playerCount}명 · ${table} 테이블` : `${playerCount}명`;
}
