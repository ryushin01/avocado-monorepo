/**
 * 방문 시각(ISO) → "11월 21일 (토) 18:00".
 * 예약 완료 화면(클라이언트 컴포넌트)에서 쓰므로 date-fns를 들이지 않고 브라우저 내장 Intl로 쓴다(번들 크기 0).
 */
const DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
const TIME = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const formatVisit = (iso: string) => `${DATE.format(new Date(iso))} ${TIME.format(new Date(iso))}`;
