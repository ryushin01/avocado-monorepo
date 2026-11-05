"use client";

import { useMinuteClock } from "@/shared/lib/use-minute-clock";
import { formatMinutes } from "@/shared/lib/format";
import { minutesBetween } from "@/shared/lib/kst-time";

/** 이용 시작부터 지금까지 걸린 시간. 1분마다 저절로 늘어난다. */
export function ElapsedTime({ since, serverNow }: { since: string; serverNow: number }) {
  const now = useMinuteClock(serverNow);
  return <>{formatMinutes(minutesBetween(since, now))}째</>;
}
