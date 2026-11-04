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
