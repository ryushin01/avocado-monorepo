// 매장은 모두 한국에 있으므로 날짜 경계는 한국 시간(UTC+9, 서머타임 없음)으로 정한다.
export const DAY = 86_400_000;
export const KST_OFFSET = 9 * 3_600_000;

/** 그 시각이 속한 한국 날짜의 0시 (UTC 밀리초) */
export function startOfKstDay(time: number) {
  return Math.floor((time + KST_OFFSET) / DAY) * DAY - KST_OFFSET;
}

/** YYYY-MM-DD(한국 날짜) → [그날 0시, 다음날 0시) */
export function kstDayRange(date: string) {
  const from = Date.parse(`${date}T00:00:00+09:00`);
  return { from, to: from + DAY };
}

/** 시각 → 한국 날짜 YYYY-MM-DD */
export function toKstDate(time: number) {
  return new Date(time + KST_OFFSET).toISOString().slice(0, 10);
}

/** 두 시각 사이의 분 (내림) */
export const minutesBetween = (from: string, to: string | number) =>
  Math.max(0, Math.floor(((typeof to === "number" ? to : Date.parse(to)) - Date.parse(from)) / 60_000));
